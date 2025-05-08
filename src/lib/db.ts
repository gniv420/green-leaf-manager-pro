import Dexie, { Table } from 'dexie';

// Define interfaces for our database tables
export interface User {
  id?: number;
  username: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Member {
  id?: number;
  firstName: string;
  lastName: string;
  memberCode: string; // Código alfanumérico único
  dob: Date;
  dni: string;
  phone: string; // Added phone field
  consumptionGrams: number;
  sponsorId: number | null;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id?: number;
  memberId: number;
  name: string;
  type: string;
  data: string; // Base64 string
  createdAt: Date;
}

// Nuevas interfaces para gestión de caja, stock y dispensario
export interface Product {
  id?: number;
  name: string;
  category: string; // Flor, Extracto, Comestible, etc.
  description: string;
  costPrice: number;
  price: number;
  stockGrams: number;
  isVisible: boolean; // Added isVisible field
  createdAt: Date;
  updatedAt: Date;
}

export interface CashTransaction {
  id?: number;
  type: 'income' | 'expense';
  amount: number;
  concept: string;
  notes: string;
  userId: number; // Usuario que registra
  cashRegisterId?: number; // ID del registro de caja
  createdAt: Date;
}

export interface CashRegister {
  id?: number;
  openingAmount: number;
  closingAmount: number | null;
  userId: number; // Usuario que abre/cierra la caja
  status: 'open' | 'closed';
  notes: string;
  openedAt: Date;
  closedAt: Date | null;
}

export interface Dispensary {
  id?: number;
  memberId: number;
  productId: number;
  quantity: number; // en gramos
  price: number; // precio de venta
  paymentMethod: 'cash' | 'bizum' | 'wallet'; // Added payment method
  notes: string;
  userId: number; // Usuario que registra
  createdAt: Date;
}

export interface MemberTransaction {
  id?: number;
  memberId: number;
  amount: number;
  type: 'deposit' | 'withdrawal';
  notes: string;
  userId: number; // Usuario que registra
  createdAt: Date;
}

// Added new interface for cash register transactions with payment methods
export interface CashRegisterTransaction extends CashTransaction {
  paymentMethod: 'cash' | 'bizum' | 'wallet';
}

// Create the database class
class CannabisDexie extends Dexie {
  users!: Table<User>;
  members!: Table<Member>;
  documents!: Table<Document>;
  products!: Table<Product>;
  cashTransactions!: Table<CashTransaction>;
  cashRegisters!: Table<CashRegister>;
  dispensary!: Table<Dispensary>;
  memberTransactions!: Table<MemberTransaction>;

  constructor() {
    super('cannabisAssociationDB');
    
    // Update version and add phone field to members, isVisible to products
    this.version(7).stores({
      users: '++id, username, createdAt',
      members: '++id, firstName, lastName, memberCode, dni, phone, sponsorId, createdAt',
      documents: '++id, memberId, createdAt',
      products: '++id, name, category, stockGrams, isVisible, createdAt', // Added isVisible index
      cashTransactions: '++id, type, cashRegisterId, paymentMethod, createdAt',
      cashRegisters: '++id, status, openedAt, closedAt',
      dispensary: '++id, memberId, productId, paymentMethod, createdAt',
      memberTransactions: '++id, memberId, type, createdAt'
    });

    // Initialize with admin user and migrate existing data
    this.on('ready', async () => {
      await this.initializeAdminUser();
      await this.migrateData();
    });
  }

  async initializeAdminUser() {
    const adminUser = await this.users.where('username').equals('admin').first();
    if (!adminUser) {
      await this.users.add({
        username: 'admin',
        password: '1234', // En una app real, esto estaría hasheado
        isAdmin: true,
        createdAt: new Date()
      });
    }
  }

  // Migrate existing data to new schema
  async migrateData() {
    try {
      // Add phone number to existing members
      const members = await this.members.toArray();
      for (const member of members) {
        if (member.id && !member.phone) {
          await this.members.update(member.id, {
            phone: '666666666' // Default test phone number
          });
        }
      }

      // Add isVisible flag to existing products
      const products = await this.products.toArray();
      for (const product of products) {
        if (product.id && product.isVisible === undefined) {
          await this.products.update(product.id, {
            isVisible: true
          });
        }
      }

      // Add payment method to existing dispensary records
      const dispensaryRecords = await this.dispensary.toArray();
      for (const record of dispensaryRecords) {
        if (record.id && !record.paymentMethod) {
          await this.dispensary.update(record.id, {
            paymentMethod: 'cash' // Default payment method
          });
        }
      }

      // Add payment method to existing cash transactions
      const cashTransactions = await this.cashTransactions.toArray();
      for (const transaction of cashTransactions) {
        if (transaction.id && !(transaction as CashRegisterTransaction).paymentMethod) {
          await this.cashTransactions.update(transaction.id, {
            paymentMethod: 'cash' // Default payment method
          });
        }
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  // Generate a unique member code
  async generateMemberCode(firstName: string, lastName: string): Promise<string> {
    // Get initials
    const firstInitial = firstName.charAt(0).toUpperCase();
    
    // Get the first letter of each word in the last name
    const lastNameWords = lastName.split(' ');
    let lastInitials = '';
    for (const word of lastNameWords) {
      if (word) lastInitials += word.charAt(0).toUpperCase();
    }
    
    const baseCode = firstInitial + lastInitials;
    
    // Find if there are existing codes with these initials
    const existingMembers = await this.members
      .filter(member => member.memberCode.startsWith(baseCode))
      .toArray();
    
    if (existingMembers.length === 0) {
      return baseCode + "1";
    } else {
      // Find the highest number and increment it
      let highestNum = 0;
      for (const member of existingMembers) {
        const numPart = member.memberCode.substring(baseCode.length);
        const num = parseInt(numPart);
        if (!isNaN(num) && num > highestNum) {
          highestNum = num;
        }
      }
      return baseCode + (highestNum + 1);
    }
  }

  // Helper method to export all data as SQL statements
  async exportAsSQLite() {
    const users = await this.users.toArray();
    const members = await this.members.toArray();
    const documents = await this.documents.toArray();
    const products = await this.products.toArray();
    const cashTransactions = await this.cashTransactions.toArray();
    const dispensary = await this.dispensary.toArray();
    const cashRegisters = await this.cashRegisters.toArray();

    let sqlScript = `
-- SQLite database dump
-- Created: ${new Date().toISOString()}

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  isAdmin INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  memberCode TEXT NOT NULL UNIQUE,
  dob TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  consumptionGrams REAL NOT NULL,
  sponsorId INTEGER NULL,
  balance REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (sponsorId) REFERENCES members(id) ON DELETE SET NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memberId INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  costPrice REAL NOT NULL,
  price REAL NOT NULL,
  stockGrams REAL NOT NULL,
  isVisible REAL NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- CashRegisters table
CREATE TABLE IF NOT EXISTS cashRegisters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openingAmount REAL NOT NULL,
  closingAmount REAL NULL,
  userId INTEGER NOT NULL,
  status TEXT NOT NULL,
  notes TEXT NOT NULL,
  openedAt TEXT NOT NULL,
  closedAt TEXT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
);

-- CashTransactions table
CREATE TABLE IF NOT EXISTS cashTransactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  concept TEXT NOT NULL,
  notes TEXT NOT NULL,
  userId INTEGER NOT NULL,
  cashRegisterId INTEGER NULL,
  paymentMethod TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (cashRegisterId) REFERENCES cashRegisters(id) ON DELETE SET NULL
);

-- Dispensary table
CREATE TABLE IF NOT EXISTS dispensary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memberId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  paymentMethod TEXT NOT NULL,
  notes TEXT NOT NULL,
  userId INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE RESTRICT,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
);

-- Data inserts
`;

    // Insert users data
    users.forEach(user => {
      sqlScript += `INSERT INTO users (username, password, isAdmin, createdAt) VALUES ('${user.username}', '${user.password}', ${user.isAdmin ? 1 : 0}, '${user.createdAt.toISOString()}');\n`;
    });

    // Insert members data
    members.forEach(member => {
      sqlScript += `INSERT INTO members (firstName, lastName, memberCode, dob, dni, phone, consumptionGrams, sponsorId, balance, createdAt, updatedAt) 
                   VALUES ('${member.firstName}', '${member.lastName}', '${member.memberCode || ""}', '${member.dob.toISOString()}', '${member.dni}', '${member.phone}', ${member.consumptionGrams}, ${member.sponsorId || 'NULL'}, ${member.balance || 0}, '${member.createdAt.toISOString()}', '${member.updatedAt.toISOString()}');\n`;
    });

    // Insert documents data (truncating binary data)
    documents.forEach(doc => {
      // For SQL export, we'll just include a placeholder for binary data
      sqlScript += `-- Document: ${doc.name} for memberId ${doc.memberId}\n`;
      sqlScript += `-- Original binary data omitted for SQL export\n`;
    });

    // Insert products data
    products.forEach(product => {
      sqlScript += `INSERT INTO products (name, category, description, costPrice, price, stockGrams, isVisible, createdAt, updatedAt) 
                   VALUES ('${product.name}', '${product.category}', '${product.description.replace(/'/g, "''")}', ${product.costPrice}, ${product.price}, ${product.stockGrams}, ${product.isVisible}, '${product.createdAt.toISOString()}', '${product.updatedAt.toISOString()}');\n`;
    });

    // Insert cashRegisters data
    cashRegisters?.forEach(register => {
      sqlScript += `INSERT INTO cashRegisters (openingAmount, closingAmount, userId, status, notes, openedAt, closedAt)
                   VALUES (${register.openingAmount}, ${register.closingAmount || 'NULL'}, ${register.userId}, '${register.status}', '${register.notes.replace(/'/g, "''")}', '${register.openedAt.toISOString()}', ${register.closedAt ? `'${register.closedAt.toISOString()}'` : 'NULL'});\n`;
    });

    // Insert cashTransactions data
    cashTransactions.forEach(transaction => {
      sqlScript += `INSERT INTO cashTransactions (type, amount, concept, notes, userId, cashRegisterId, paymentMethod, createdAt) 
                   VALUES ('${transaction.type}', ${transaction.amount}, '${transaction.concept.replace(/'/g, "''")}', '${transaction.notes.replace(/'/g, "''")}', ${transaction.userId}, ${transaction.cashRegisterId || 'NULL'}, '${transaction.paymentMethod}', '${transaction.createdAt.toISOString()}');\n`;
    });

    // Insert dispensary data
    dispensary.forEach(disp => {
      sqlScript += `INSERT INTO dispensary (memberId, productId, quantity, price, paymentMethod, notes, userId, createdAt) 
                   VALUES (${disp.memberId}, ${disp.productId}, ${disp.quantity}, ${disp.price}, '${disp.paymentMethod}', '${disp.notes.replace(/'/g, "''")}', ${disp.userId}, '${disp.createdAt.toISOString()}');\n`;
    });

    return sqlScript;
  }
}

// Export a single instance throughout the app
export const db = new CannabisDexie();
