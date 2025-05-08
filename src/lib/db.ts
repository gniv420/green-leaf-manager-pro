
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
  dob: Date;
  dni: string;
  consumptionGrams: number;
  sponsorId: number | null;
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
  thcPercentage: number;
  cbdPercentage: number;
  description: string;
  price: number;
  stockGrams: number;
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
  createdAt: Date;
}

export interface Dispensary {
  id?: number;
  memberId: number;
  productId: number;
  quantity: number; // en gramos
  price: number; // precio de venta
  notes: string;
  userId: number; // Usuario que registra
  createdAt: Date;
}

// Create the database class
class CannabisDexie extends Dexie {
  users!: Table<User>;
  members!: Table<Member>;
  documents!: Table<Document>;
  products!: Table<Product>;
  cashTransactions!: Table<CashTransaction>;
  dispensary!: Table<Dispensary>;

  constructor() {
    super('cannabisAssociationDB');
    
    this.version(3).stores({
      users: '++id, username, createdAt',
      members: '++id, firstName, lastName, dni, sponsorId, createdAt',
      documents: '++id, memberId, createdAt',
      products: '++id, name, category, createdAt',
      cashTransactions: '++id, type, createdAt',
      dispensary: '++id, memberId, productId, createdAt'
    });

    // Initialize with admin user if it doesn't exist
    this.on('ready', () => this.initializeAdminUser());
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

  // Helper method to export all data as SQL statements
  async exportAsSQLite() {
    const users = await this.users.toArray();
    const members = await this.members.toArray();
    const documents = await this.documents.toArray();
    const products = await this.products.toArray();
    const cashTransactions = await this.cashTransactions.toArray();
    const dispensary = await this.dispensary.toArray();

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
  dob TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  consumptionGrams REAL NOT NULL,
  sponsorId INTEGER NULL,
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
  thcPercentage REAL NOT NULL,
  cbdPercentage REAL NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  stockGrams REAL NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- CashTransactions table
CREATE TABLE IF NOT EXISTS cashTransactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  concept TEXT NOT NULL,
  notes TEXT NOT NULL,
  userId INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
);

-- Dispensary table
CREATE TABLE IF NOT EXISTS dispensary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memberId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
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
      sqlScript += `INSERT INTO members (firstName, lastName, dob, dni, consumptionGrams, sponsorId, createdAt, updatedAt) 
                   VALUES ('${member.firstName}', '${member.lastName}', '${member.dob.toISOString()}', '${member.dni}', ${member.consumptionGrams}, ${member.sponsorId || 'NULL'}, '${member.createdAt.toISOString()}', '${member.updatedAt.toISOString()}');\n`;
    });

    // Insert documents data (truncating binary data)
    documents.forEach(doc => {
      // For SQL export, we'll just include a placeholder for binary data
      sqlScript += `-- Document: ${doc.name} for memberId ${doc.memberId}\n`;
      sqlScript += `-- Original binary data omitted for SQL export\n`;
    });

    // Insert products data
    products.forEach(product => {
      sqlScript += `INSERT INTO products (name, category, thcPercentage, cbdPercentage, description, price, stockGrams, createdAt, updatedAt) 
                   VALUES ('${product.name}', '${product.category}', ${product.thcPercentage}, ${product.cbdPercentage}, '${product.description.replace(/'/g, "''")}', ${product.price}, ${product.stockGrams}, '${product.createdAt.toISOString()}', '${product.updatedAt.toISOString()}');\n`;
    });

    // Insert cashTransactions data
    cashTransactions.forEach(transaction => {
      sqlScript += `INSERT INTO cashTransactions (type, amount, concept, notes, userId, createdAt) 
                   VALUES ('${transaction.type}', ${transaction.amount}, '${transaction.concept.replace(/'/g, "''")}', '${transaction.notes.replace(/'/g, "''")}', ${transaction.userId}, '${transaction.createdAt.toISOString()}');\n`;
    });

    // Insert dispensary data
    dispensary.forEach(disp => {
      sqlScript += `INSERT INTO dispensary (memberId, productId, quantity, price, notes, userId, createdAt) 
                   VALUES (${disp.memberId}, ${disp.productId}, ${disp.quantity}, ${disp.price}, '${disp.notes.replace(/'/g, "''")}', ${disp.userId}, '${disp.createdAt.toISOString()}');\n`;
    });

    return sqlScript;
  }
}

// Export a single instance throughout the app
export const db = new CannabisDexie();
