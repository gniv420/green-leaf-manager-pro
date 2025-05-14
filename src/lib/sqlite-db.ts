import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

// Tipos de datos equivalentes a los que teníamos en Dexie
export interface User {
  id?: number;
  username: string;
  password: string;
  fullName: string;
  isAdmin: boolean;
  createdAt: string; // Cambiado a string para SQLite
  lastLogin?: string; // Cambiado a string para SQLite
}

export interface Member {
  id?: number;
  memberCode: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  dob: string; // Cambiado a string para SQLite
  address: string;
  city: string;
  postalCode: string;
  joinDate: string; // Cambiado a string para SQLite
  consumptionGrams: number;
  notes?: string;
  status: 'active' | 'inactive' | 'pending';
  balance?: number;
  sponsorId?: number | null;
  rfidCode?: string;
  createdAt: string; // Cambiado a string para SQLite
  updatedAt: string; // Cambiado a string para SQLite
}

export interface MemberTransaction {
  id?: number;
  memberId: number;
  amount: number;
  type: 'deposit' | 'withdrawal';
  notes?: string;
  userId: number;
  createdAt: string; // Cambiado a string para SQLite
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  category: string;
  type: string; // ProductType convertido a string
  price: number;
  costPrice?: number;
  stockGrams: number;
  isVisible?: boolean;
  image?: string;
  notes?: string;
  createdAt: string; // Cambiado a string para SQLite
  updatedAt: string; // Cambiado a string para SQLite
}

export interface Dispensary {
  id?: number;
  memberId: number;
  productId: number;
  quantity: number;
  price: number;
  paymentMethod: 'cash' | 'bizum' | 'wallet';
  notes?: string;
  userId: number;
  createdAt: string; // Cambiado a string para SQLite
}

export interface CashRegister {
  id?: number;
  openDate: string; // Cambiado a string para SQLite
  closeDate?: string; // Cambiado a string para SQLite
  initialBalance: number;
  finalBalance?: number;
  status: 'open' | 'closed';
  openingAmount: number;
  closingAmount?: number;
  userId: number;
  notes?: string;
  openedAt: string; // Cambiado a string para SQLite
  closedAt?: string; // Cambiado a string para SQLite
}

export interface CashTransaction {
  id?: number;
  cashRegisterId: number;
  type: 'income' | 'expense';
  amount: number;
  concept: string;
  notes?: string;
  userId: number;
  paymentMethod: 'cash' | 'bizum' | 'wallet';
  createdAt: string; // Cambiado a string para SQLite
}

export interface Document {
  id?: number;
  memberId: number;
  type: string; // DocumentType convertido a string
  uploadDate: string; // Cambiado a string para SQLite
  name: string;
  fileName: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: string; // Cambiado a string para SQLite
}

// Aseguramos que exista el directorio data
const dataDir = path.resolve(process.env.DB_PATH || './data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ruta de la base de datos
const dbPath = process.env.DB_PATH || './data/club.db';

// Función para inicializar la base de datos
async function initializeDatabase() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Crear tablas si no existen
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      fullName TEXT NOT NULL,
      isAdmin INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      lastLogin TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberCode TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      dni TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      dob TEXT NOT NULL,
      address TEXT,
      city TEXT,
      postalCode TEXT,
      joinDate TEXT NOT NULL,
      consumptionGrams REAL NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      balance REAL DEFAULT 0,
      sponsorId INTEGER,
      rfidCode TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      costPrice REAL,
      stockGrams REAL NOT NULL,
      isVisible INTEGER DEFAULT 1,
      image TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dispensary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (memberId) REFERENCES members (id),
      FOREIGN KEY (productId) REFERENCES products (id),
      FOREIGN KEY (userId) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openDate TEXT NOT NULL,
      closeDate TEXT,
      initialBalance REAL NOT NULL,
      finalBalance REAL,
      status TEXT NOT NULL,
      openingAmount REAL NOT NULL,
      closingAmount REAL,
      userId INTEGER NOT NULL,
      notes TEXT,
      openedAt TEXT NOT NULL,
      closedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashRegisterId INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      concept TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      paymentMethod TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (cashRegisterId) REFERENCES cash_registers (id),
      FOREIGN KEY (userId) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberId INTEGER NOT NULL,
      type TEXT NOT NULL,
      uploadDate TEXT NOT NULL,
      name TEXT NOT NULL,
      fileName TEXT NOT NULL,
      contentType TEXT NOT NULL,
      size INTEGER NOT NULL,
      data BLOB NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (memberId) REFERENCES members (id)
    );

    CREATE TABLE IF NOT EXISTS member_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberId INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (memberId) REFERENCES members (id),
      FOREIGN KEY (userId) REFERENCES users (id)
    );
  `);

  // Verificar si hay usuarios, si no, crear el admin por defecto
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await db.run(`
      INSERT INTO users (username, password, fullName, isAdmin, createdAt)
      VALUES ('admin', '1234', 'Administrator', 1, datetime('now'))
    `);
  }

  // Verificar si hay productos, si no, crear algunos productos iniciales
  const productCount = await db.get('SELECT COUNT(*) as count FROM products');
  if (productCount.count === 0) {
    const now = new Date().toISOString();
    await db.run(`
      INSERT INTO products (name, category, type, price, costPrice, stockGrams, isVisible, createdAt, updatedAt)
      VALUES 
        ('Amnesia Haze', 'Flor', 'sativa', 8.50, 6.00, 50, 1, datetime('now'), datetime('now')),
        ('Critical Kush', 'Flor', 'indica', 9.00, 6.50, 30, 1, datetime('now'), datetime('now')),
        ('White Widow', 'Flor', 'hibrido', 8.00, 5.50, 40, 1, datetime('now'), datetime('now')),
        ('Gorilla Glue', 'Flor', 'hibrido', 9.50, 7.00, 25, 1, datetime('now'), datetime('now')),
        ('Northern Lights', 'Flor', 'indica', 8.75, 6.25, 35, 1, datetime('now'), datetime('now'))
    `);
  }

  return db;
}

// Inicializar la base de datos
const dbPromise = initializeDatabase();

// Clase para manejar operaciones CRUD
class SQLiteDB {
  // Método para generar códigos de miembro
  async generateMemberCode(firstName: string, lastName: string): Promise<string> {
    const db = await dbPromise;
    const date = new Date();
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get first letters of first and last name
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    
    // Get count of members for sequential numbering
    const memberCount = await db.get('SELECT COUNT(*) as count FROM members');
    const sequentialNumber = (memberCount.count + 1).toString().padStart(3, '0');
    
    return `${year}${month}-${firstInitial}${lastInitial}${sequentialNumber}`;
  }

  // USUARIOS
  async getUsers(): Promise<User[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM users');
  }

  async getUserById(id: number): Promise<User | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM users WHERE id = ?', id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM users WHERE username = ?', username);
  }

  async addUser(user: Omit<User, 'id'>): Promise<number> {
    const db = await dbPromise;
    const result = await db.run(
      'INSERT INTO users (username, password, fullName, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?)',
      user.username, user.password, user.fullName, user.isAdmin ? 1 : 0, new Date().toISOString()
    );
    return result.lastID || 0;
  }

  async updateUser(id: number, user: Partial<User>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    // Construir dinámicamente la consulta SQL
    Object.entries(user).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        if (key === 'isAdmin' && typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    values.push(id); // Agregar el ID al final
    await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteUser(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM users WHERE id = ?', id);
  }

  // MIEMBROS
  async getMembers(): Promise<Member[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM members');
  }

  async getMemberById(id: number): Promise<Member | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM members WHERE id = ?', id);
  }

  async getMemberByRfid(rfidCode: string): Promise<Member | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM members WHERE rfidCode = ? AND rfidCode != ""', rfidCode);
  }

  async addMember(member: Omit<Member, 'id' | 'memberCode'>): Promise<number> {
    const db = await dbPromise;
    const memberCode = await this.generateMemberCode(member.firstName, member.lastName);
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO members (
        memberCode, firstName, lastName, dni, email, phone, dob, address, city, 
        postalCode, joinDate, consumptionGrams, notes, status, balance, sponsorId, 
        rfidCode, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      memberCode, member.firstName, member.lastName, member.dni, member.email, 
      member.phone, member.dob, member.address, member.city, member.postalCode, 
      member.joinDate, member.consumptionGrams, member.notes, member.status,
      member.balance || 0, member.sponsorId, member.rfidCode, now, now
    );
    
    return result.lastID || 0;
  }

  async updateMember(id: number, member: Partial<Member>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    // Agregar updatedAt automáticamente
    member.updatedAt = new Date().toISOString();

    Object.entries(member).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        if (key === 'isVisible' && typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteMember(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM members WHERE id = ?', id);
  }

  // PRODUCTOS
  async getProducts(): Promise<Product[]> {
    const db = await dbPromise;
    const products = await db.all('SELECT * FROM products');
    return products.map(product => ({
      ...product,
      isVisible: !!product.isVisible
    }));
  }

  async getVisibleProducts(): Promise<Product[]> {
    const db = await dbPromise;
    const products = await db.all('SELECT * FROM products WHERE isVisible = 1');
    return products.map(product => ({
      ...product,
      isVisible: true
    }));
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const db = await dbPromise;
    const product = await db.get('SELECT * FROM products WHERE id = ?', id);
    if (product) {
      product.isVisible = !!product.isVisible;
    }
    return product;
  }

  async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO products (
        name, description, category, type, price, costPrice, stockGrams, 
        isVisible, image, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      product.name, product.description, product.category, product.type,
      product.price, product.costPrice, product.stockGrams,
      product.isVisible === false ? 0 : 1, product.image, product.notes, now, now
    );
    
    return result.lastID || 0;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    // Agregar updatedAt automáticamente
    product.updatedAt = new Date().toISOString();

    Object.entries(product).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        if (key === 'isVisible' && typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteProduct(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM products WHERE id = ?', id);
  }

  // DISPENSARY
  async getDispensaryRecords(): Promise<Dispensary[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM dispensary');
  }

  async getDispensaryForMember(memberId: number): Promise<Dispensary[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM dispensary WHERE memberId = ? ORDER BY createdAt DESC', memberId);
  }

  async addDispensaryRecord(record: Omit<Dispensary, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO dispensary (
        memberId, productId, quantity, price, paymentMethod, notes, userId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      record.memberId, record.productId, record.quantity, record.price,
      record.paymentMethod, record.notes, record.userId, now
    );
    
    return result.lastID || 0;
  }

  async getRecentDispensations(limit: number = 5): Promise<any[]> {
    const db = await dbPromise;
    return db.all(`
      SELECT d.*, m.firstName, m.lastName, p.name as productName
      FROM dispensary d
      JOIN members m ON d.memberId = m.id
      JOIN products p ON d.productId = p.id
      ORDER BY d.createdAt DESC
      LIMIT ?
    `, limit);
  }

  // CASH REGISTER
  async getOpenCashRegister(): Promise<CashRegister | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM cash_registers WHERE status = "open" LIMIT 1');
  }

  async getCashRegisters(): Promise<CashRegister[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM cash_registers ORDER BY openedAt DESC');
  }

  async addCashRegister(register: Omit<CashRegister, 'id'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO cash_registers (
        openDate, closeDate, initialBalance, finalBalance, status,
        openingAmount, closingAmount, userId, notes, openedAt, closedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      now, register.closeDate, register.initialBalance, register.finalBalance,
      register.status, register.openingAmount, register.closingAmount,
      register.userId, register.notes, now, register.closedAt
    );
    
    return result.lastID || 0;
  }

  async updateCashRegister(id: number, register: Partial<CashRegister>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(register).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE cash_registers SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  // CASH TRANSACTIONS
  async getCashTransactions(cashRegisterId: number): Promise<CashTransaction[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM cash_transactions WHERE cashRegisterId = ? ORDER BY createdAt DESC', cashRegisterId);
  }

  async getTodayTransactions(): Promise<CashTransaction[]> {
    const db = await dbPromise;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartStr = todayStart.toISOString();
    
    return db.all('SELECT * FROM cash_transactions WHERE createdAt >= ?', todayStartStr);
  }

  async addCashTransaction(transaction: Omit<CashTransaction, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO cash_transactions (
        cashRegisterId, type, amount, concept, notes, userId, paymentMethod, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      transaction.cashRegisterId, transaction.type, transaction.amount,
      transaction.concept, transaction.notes, transaction.userId,
      transaction.paymentMethod, now
    );
    
    return result.lastID || 0;
  }

  // MEMBER TRANSACTIONS
  async getMemberTransactions(memberId: number): Promise<MemberTransaction[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM member_transactions WHERE memberId = ? ORDER BY createdAt DESC', memberId);
  }

  async addMemberTransaction(transaction: Omit<MemberTransaction, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO member_transactions (
        memberId, amount, type, notes, userId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      transaction.memberId, transaction.amount, transaction.type,
      transaction.notes, transaction.userId, now
    );
    
    return result.lastID || 0;
  }

  // DOCUMENTS
  async getDocuments(memberId: number): Promise<Document[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM documents WHERE memberId = ?', memberId);
  }

  async addDocument(document: Omit<Document, 'id'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO documents (
        memberId, type, uploadDate, name, fileName, contentType, size, data, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      document.memberId, document.type, now, document.name,
      document.fileName, document.contentType, document.size,
      document.data, now
    );
    
    return result.lastID || 0;
  }

  async deleteDocument(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM documents WHERE id = ?', id);
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM documents WHERE id = ?', id);
  }

  // EXPORTACIÓN E IMPORTACIÓN
  async exportToFile(): Promise<string> {
    try {
      const db = await dbPromise;
      
      // Collect all data from the database
      const members = await db.all('SELECT * FROM members');
      const users = await db.all('SELECT * FROM users');
      const documents = await db.all('SELECT * FROM documents');
      const products = await db.all('SELECT * FROM products');
      const dispensary = await db.all('SELECT * FROM dispensary');
      const cashRegisters = await db.all('SELECT * FROM cash_registers');
      const cashTransactions = await db.all('SELECT * FROM cash_transactions');
      const memberTransactions = await db.all('SELECT * FROM member_transactions');
      
      // Create the export object
      const exportData = {
        members,
        users,
        documents,
        products,
        dispensary,
        cashRegisters,
        cashTransactions,
        memberTransactions,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      // Convert to JSON and save in localStorage for easy access
      const jsonString = JSON.stringify(exportData);
      return jsonString;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Error al exportar los datos de la base de datos');
    }
  }

  async importFromJson(jsonData: string): Promise<void> {
    try {
      const db = await dbPromise;
      const importData = JSON.parse(jsonData);
      
      // Validate the import data
      if (!importData.members || !importData.users) {
        throw new Error('Formato de archivo inválido');
      }
      
      // Clear existing data - usar una transacción
      await db.run('BEGIN TRANSACTION');
      try {
        await db.run('DELETE FROM members');
        await db.run('DELETE FROM users');
        await db.run('DELETE FROM documents');
        await db.run('DELETE FROM products');
        await db.run('DELETE FROM dispensary');
        await db.run('DELETE FROM cash_registers');
        await db.run('DELETE FROM cash_transactions');
        await db.run('DELETE FROM member_transactions');
        
        // Import members
        for (const member of importData.members) {
          await db.run(`
            INSERT INTO members (
              memberCode, firstName, lastName, dni, email, phone, dob, address, city, 
              postalCode, joinDate, consumptionGrams, notes, status, balance, sponsorId, 
              rfidCode, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            member.memberCode, member.firstName, member.lastName, member.dni,
            member.email, member.phone, member.dob, member.address, member.city,
            member.postalCode, member.joinDate, member.consumptionGrams,
            member.notes, member.status, member.balance || 0, 
            member.sponsorId, member.rfidCode, member.createdAt, member.updatedAt
          );
        }
        
        // Import users
        for (const user of importData.users) {
          await db.run(`
            INSERT INTO users (
              username, password, fullName, isAdmin, createdAt, lastLogin
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
            user.username, user.password, user.fullName,
            user.isAdmin ? 1 : 0, user.createdAt, user.lastLogin
          );
        }
        
        // Import documents if they exist
        if (importData.documents) {
          for (const document of importData.documents) {
            await db.run(`
              INSERT INTO documents (
                memberId, type, uploadDate, name, fileName, contentType, size, data, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              document.memberId, document.type, document.uploadDate,
              document.name, document.fileName, document.contentType,
              document.size, document.data, document.createdAt
            );
          }
        }
        
        // Import products if they exist
        if (importData.products) {
          for (const product of importData.products) {
            await db.run(`
              INSERT INTO products (
                name, description, category, type, price, costPrice, stockGrams, 
                isVisible, image, notes, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              product.name, product.description, product.category,
              product.type, product.price, product.costPrice,
              product.stockGrams, product.isVisible ? 1 : 0, 
              product.image, product.notes, product.createdAt, product.updatedAt
            );
          }
        }
        
        // Import dispensary records if they exist
        if (importData.dispensary) {
          for (const item of importData.dispensary) {
            await db.run(`
              INSERT INTO dispensary (
                memberId, productId, quantity, price, paymentMethod, notes, userId, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
              item.memberId, item.productId, item.quantity, item.price,
              item.paymentMethod, item.notes, item.userId, item.createdAt
            );
          }
        }
        
        // Import cash registers if they exist
        if (importData.cashRegisters) {
          for (const register of importData.cashRegisters) {
            await db.run(`
              INSERT INTO cash_registers (
                openDate, closeDate, initialBalance, finalBalance, status,
                openingAmount, closingAmount, userId, notes, openedAt, closedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              register.openDate, register.closeDate, register.initialBalance,
              register.finalBalance, register.status, register.openingAmount,
              register.closingAmount, register.userId, register.notes,
              register.openedAt, register.closedAt
            );
          }
        }
        
        // Import cash transactions if they exist
        if (importData.cashTransactions) {
          for (const transaction of importData.cashTransactions) {
            await db.run(`
              INSERT INTO cash_transactions (
                cashRegisterId, type, amount, concept, notes, userId, paymentMethod, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
              transaction.cashRegisterId, transaction.type, transaction.amount,
              transaction.concept, transaction.notes, transaction.userId,
              transaction.paymentMethod, transaction.createdAt
            );
          }
        }
        
        // Import member transactions if they exist
        if (importData.memberTransactions) {
          for (const transaction of importData.memberTransactions) {
            await db.run(`
              INSERT INTO member_transactions (
                memberId, amount, type, notes, userId, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?)
            `,
              transaction.memberId, transaction.amount, transaction.type,
              transaction.notes, transaction.userId, transaction.createdAt
            );
          }
        }
        
        await db.run('COMMIT');
        console.log('Database import completed successfully');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Error al importar los datos');
    }
  }

  // Método para eliminar una dispensación
  async deleteDispensary(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM dispensary WHERE id = ?', id);
  }
}

export const db = new SQLiteDB();
