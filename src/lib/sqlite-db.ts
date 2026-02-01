import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

// Tipos de datos para pizzería con IGIC de Canarias
export interface User {
  id?: number;
  username: string;
  password: string;
  fullName: string;
  isAdmin: boolean;
  createdAt: string;
  lastLogin?: string;
}

// Producto de la pizzería (pizzas, bebidas, entrantes, postres)
export interface Product {
  id?: number;
  name: string;
  description?: string;
  category: 'pizza' | 'bebida' | 'entrante' | 'postre' | 'otro';
  price: number;
  costPrice?: number;
  stock?: number; // Unidades en stock
  igicRate: number; // Tipo de IGIC: 0, 3, 7 (%)
  isVisible: boolean;
  image?: string;
  ingredients?: string; // Para pizzas
  size?: 'pequeña' | 'mediana' | 'grande' | 'familiar'; // Para pizzas
  createdAt: string;
  updatedAt: string;
}

// Cliente (opcional, para facturas)
export interface Customer {
  id?: number;
  name: string;
  cif?: string; // CIF/NIF
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Factura de venta
export interface Invoice {
  id?: number;
  invoiceNumber: string; // Número de factura
  customerId?: number; // Cliente (opcional)
  customerName?: string; // Nombre del cliente (si no está registrado)
  date: string;
  subtotal: number; // Base imponible
  igic0: number; // IGIC 0%
  igic3: number; // IGIC 3%
  igic7: number; // IGIC 7%
  totalIgic: number; // Total IGIC
  total: number; // Total factura
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'bizum';
  status: 'pagada' | 'pendiente' | 'anulada';
  notes?: string;
  userId: number;
  createdAt: string;
}

// Línea de factura
export interface InvoiceLine {
  id?: number;
  invoiceId: number;
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  igicRate: number;
  subtotal: number; // Cantidad sin IGIC
  igicAmount: number; // Cantidad de IGIC
  total: number; // Total con IGIC
  createdAt: string;
}

// Gasto/Compra
export interface Expense {
  id?: number;
  expenseNumber?: string; // Número de factura del proveedor
  supplier: string; // Proveedor
  supplierCif?: string; // CIF del proveedor
  date: string;
  concept: string; // Concepto del gasto
  category: 'compra_mercancía' | 'alquiler' | 'suministros' | 'servicios' | 'salarios' | 'otros';
  subtotal: number; // Base imponible
  igicRate: number; // Tipo de IGIC aplicado
  igicAmount: number; // Cantidad de IGIC soportado
  total: number; // Total del gasto
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'domiciliación';
  status: 'pagado' | 'pendiente';
  notes?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// Caja diaria
export interface CashRegister {
  id?: number;
  openDate: string;
  closeDate?: string;
  initialBalance: number;
  finalBalance?: number;
  status: 'abierta' | 'cerrada';
  userId: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Movimiento de caja
export interface CashMovement {
  id?: number;
  cashRegisterId: number;
  type: 'ingreso' | 'gasto' | 'venta' | 'apertura' | 'cierre';
  amount: number;
  concept: string;
  invoiceId?: number; // Relacionado con factura
  expenseId?: number; // Relacionado con gasto
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'bizum';
  userId: number;
  createdAt: string;
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

  // Crear tablas para pizzería con IGIC
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

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      costPrice REAL,
      stock INTEGER DEFAULT 0,
      igicRate REAL NOT NULL,
      isVisible INTEGER DEFAULT 1,
      image TEXT,
      ingredients TEXT,
      size TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cif TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      postalCode TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNumber TEXT UNIQUE NOT NULL,
      customerId INTEGER,
      customerName TEXT,
      date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      igic0 REAL DEFAULT 0,
      igic3 REAL DEFAULT 0,
      igic7 REAL DEFAULT 0,
      totalIgic REAL NOT NULL,
      total REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (customerId) REFERENCES customers (id),
      FOREIGN KEY (userId) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER NOT NULL,
      productId INTEGER,
      productName TEXT NOT NULL,
      quantity REAL NOT NULL,
      unitPrice REAL NOT NULL,
      igicRate REAL NOT NULL,
      subtotal REAL NOT NULL,
      igicAmount REAL NOT NULL,
      total REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products (id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expenseNumber TEXT,
      supplier TEXT NOT NULL,
      supplierCif TEXT,
      date TEXT NOT NULL,
      concept TEXT NOT NULL,
      category TEXT NOT NULL,
      subtotal REAL NOT NULL,
      igicRate REAL NOT NULL,
      igicAmount REAL NOT NULL,
      total REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openDate TEXT NOT NULL,
      closeDate TEXT,
      initialBalance REAL NOT NULL,
      finalBalance REAL,
      status TEXT NOT NULL,
      userId INTEGER NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashRegisterId INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      concept TEXT NOT NULL,
      invoiceId INTEGER,
      expenseId INTEGER,
      paymentMethod TEXT NOT NULL,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (cashRegisterId) REFERENCES cash_registers (id),
      FOREIGN KEY (invoiceId) REFERENCES invoices (id),
      FOREIGN KEY (expenseId) REFERENCES expenses (id),
      FOREIGN KEY (userId) REFERENCES users (id)
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoiceId);
    CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON cash_movements(cashRegisterId);
  `);

  // Verificar si hay usuarios, si no, crear el admin por defecto
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await db.run(`
      INSERT INTO users (username, password, fullName, isAdmin, createdAt)
      VALUES ('admin', 'admin123', 'Administrador', 1, datetime('now'))
    `);
  }

  // Verificar si hay productos, si no, crear productos iniciales de pizzería
  const productCount = await db.get('SELECT COUNT(*) as count FROM products');
  if (productCount.count === 0) {
    await db.run(`
      INSERT INTO products (name, description, category, price, costPrice, stock, igicRate, isVisible, size, ingredients, createdAt, updatedAt)
      VALUES 
        ('Pizza Margarita', 'Tomate, mozzarella y albahaca', 'pizza', 8.50, 3.50, 0, 7, 1, 'mediana', 'tomate, mozzarella, albahaca', datetime('now'), datetime('now')),
        ('Pizza Carbonara', 'Nata, bacon, champiñones y queso', 'pizza', 10.50, 4.50, 0, 7, 1, 'mediana', 'nata, bacon, champiñones, queso', datetime('now'), datetime('now')),
        ('Pizza Cuatro Quesos', 'Mozzarella, gorgonzola, parmesano y queso de cabra', 'pizza', 11.00, 5.00, 0, 7, 1, 'mediana', 'mozzarella, gorgonzola, parmesano, queso de cabra', datetime('now'), datetime('now')),
        ('Pizza Pepperoni', 'Tomate, mozzarella y pepperoni', 'pizza', 9.50, 4.00, 0, 7, 1, 'mediana', 'tomate, mozzarella, pepperoni', datetime('now'), datetime('now')),
        ('Pizza Hawaiana', 'Tomate, mozzarella, jamón york y piña', 'pizza', 9.00, 4.00, 0, 7, 1, 'mediana', 'tomate, mozzarella, jamón york, piña', datetime('now'), datetime('now')),
        ('Pizza Barbacoa', 'Salsa barbacoa, pollo, cebolla y bacon', 'pizza', 11.50, 5.50, 0, 7, 1, 'mediana', 'salsa barbacoa, pollo, cebolla, bacon', datetime('now'), datetime('now')),
        ('Coca Cola', 'Refresco 33cl', 'bebida', 2.50, 0.80, 0, 7, 1, NULL, NULL, datetime('now'), datetime('now')),
        ('Agua Mineral', 'Agua 50cl', 'bebida', 1.50, 0.40, 0, 3, 1, NULL, NULL, datetime('now'), datetime('now')),
        ('Cerveza', 'Cerveza 33cl', 'bebida', 2.00, 0.70, 0, 7, 1, NULL, NULL, datetime('now'), datetime('now')),
        ('Ensalada César', 'Lechuga, pollo, parmesano, crutones', 'entrante', 6.50, 2.50, 0, 7, 1, NULL, NULL, datetime('now'), datetime('now')),
        ('Alitas de Pollo', '6 unidades con salsa barbacoa', 'entrante', 7.00, 3.00, 0, 7, 1, NULL, NULL, datetime('now'), datetime('now')),
        ('Tiramisú', 'Postre italiano tradicional', 'postre', 4.50, 1.80, 0, 7, 1, NULL, NULL, datetime('now'), datetime('now')),
        ('Brownie con Helado', 'Brownie de chocolate con helado de vainilla', 'postre', 5.00, 2.00, 0, 7, 1, NULL, NULL, datetime('now'), datetime('now'))
    `);
  }

  return db;
}

// Inicializar la base de datos
const dbPromise = initializeDatabase();

// Clase para manejar operaciones CRUD
class SQLiteDB {
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

    values.push(id);
    await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteUser(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM users WHERE id = ?', id);
  }

  // PRODUCTOS
  async getProducts(): Promise<Product[]> {
    const db = await dbPromise;
    const products = await db.all('SELECT * FROM products ORDER BY category, name');
    return products.map(product => ({
      ...product,
      isVisible: !!product.isVisible
    }));
  }

  async getVisibleProducts(): Promise<Product[]> {
    const db = await dbPromise;
    const products = await db.all('SELECT * FROM products WHERE isVisible = 1 ORDER BY category, name');
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
        name, description, category, price, costPrice, stock, igicRate,
        isVisible, image, ingredients, size, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      product.name, product.description, product.category, product.price,
      product.costPrice, product.stock || 0, product.igicRate,
      product.isVisible === false ? 0 : 1, product.image, 
      product.ingredients, product.size, now, now
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

  async getProductsByCategory(category: string): Promise<Product[]> {
    const db = await dbPromise;
    const products = await db.all('SELECT * FROM products WHERE category = ? AND isVisible = 1 ORDER BY name', category);
    return products.map(product => ({
      ...product,
      isVisible: true
    }));
  }

  // CLIENTES
  async getCustomers(): Promise<Customer[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM customers ORDER BY name');
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM customers WHERE id = ?', id);
  }

  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO customers (
        name, cif, email, phone, address, city, postalCode, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      customer.name, customer.cif, customer.email, customer.phone,
      customer.address, customer.city, customer.postalCode, now, now
    );
    
    return result.lastID || 0;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    customer.updatedAt = new Date().toISOString();

    Object.entries(customer).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteCustomer(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM customers WHERE id = ?', id);
  }

  // FACTURAS
  async generateInvoiceNumber(): Promise<string> {
    const db = await dbPromise;
    const year = new Date().getFullYear();
    const lastInvoice = await db.get(
      'SELECT invoiceNumber FROM invoices WHERE invoiceNumber LIKE ? ORDER BY id DESC LIMIT 1',
      `${year}/%`
    );
    
    if (!lastInvoice) {
      return `${year}/0001`;
    }
    
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('/')[1]);
    const newNumber = (lastNumber + 1).toString().padStart(4, '0');
    return `${year}/${newNumber}`;
  }

  async getInvoices(): Promise<Invoice[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM invoices ORDER BY date DESC, id DESC');
  }

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM invoices WHERE id = ?', id);
  }

  async getInvoicesByDateRange(startDate: string, endDate: string): Promise<Invoice[]> {
    const db = await dbPromise;
    return db.all(
      'SELECT * FROM invoices WHERE date >= ? AND date <= ? ORDER BY date DESC',
      startDate, endDate
    );
  }

  async addInvoice(invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const invoiceNumber = await this.generateInvoiceNumber();
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO invoices (
        invoiceNumber, customerId, customerName, date, subtotal, igic0, igic3, igic7,
        totalIgic, total, paymentMethod, status, notes, userId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      invoiceNumber, invoice.customerId, invoice.customerName, invoice.date,
      invoice.subtotal, invoice.igic0, invoice.igic3, invoice.igic7,
      invoice.totalIgic, invoice.total, invoice.paymentMethod, invoice.status,
      invoice.notes, invoice.userId, now
    );
    
    return result.lastID || 0;
  }

  async updateInvoice(id: number, invoice: Partial<Invoice>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(invoice).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'invoiceNumber' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteInvoice(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM invoices WHERE id = ?', id);
  }

  // LÍNEAS DE FACTURA
  async getInvoiceLines(invoiceId: number): Promise<InvoiceLine[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY id', invoiceId);
  }

  async addInvoiceLine(line: Omit<InvoiceLine, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO invoice_lines (
        invoiceId, productId, productName, quantity, unitPrice, igicRate,
        subtotal, igicAmount, total, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      line.invoiceId, line.productId, line.productName, line.quantity,
      line.unitPrice, line.igicRate, line.subtotal, line.igicAmount,
      line.total, now
    );
    
    return result.lastID || 0;
  }

  async deleteInvoiceLine(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM invoice_lines WHERE id = ?', id);
  }

  async deleteInvoiceLines(invoiceId: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM invoice_lines WHERE invoiceId = ?', invoiceId);
  }

  // GASTOS
  async getExpenses(): Promise<Expense[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM expenses ORDER BY date DESC, id DESC');
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM expenses WHERE id = ?', id);
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const db = await dbPromise;
    return db.all(
      'SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC',
      startDate, endDate
    );
  }

  async addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO expenses (
        expenseNumber, supplier, supplierCif, date, concept, category,
        subtotal, igicRate, igicAmount, total, paymentMethod, status,
        notes, userId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      expense.expenseNumber, expense.supplier, expense.supplierCif, expense.date,
      expense.concept, expense.category, expense.subtotal, expense.igicRate,
      expense.igicAmount, expense.total, expense.paymentMethod, expense.status,
      expense.notes, expense.userId, now, now
    );
    
    return result.lastID || 0;
  }

  async updateExpense(id: number, expense: Partial<Expense>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    expense.updatedAt = new Date().toISOString();

    Object.entries(expense).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteExpense(id: number): Promise<void> {
    const db = await dbPromise;
    await db.run('DELETE FROM expenses WHERE id = ?', id);
  }

  // CAJA
  async getOpenCashRegister(): Promise<CashRegister | undefined> {
    const db = await dbPromise;
    return db.get('SELECT * FROM cash_registers WHERE status = "abierta" LIMIT 1');
  }

  async getCashRegisters(): Promise<CashRegister[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM cash_registers ORDER BY createdAt DESC');
  }

  async addCashRegister(register: Omit<CashRegister, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO cash_registers (
        openDate, closeDate, initialBalance, finalBalance, status,
        userId, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      register.openDate, register.closeDate, register.initialBalance, 
      register.finalBalance, register.status, register.userId, 
      register.notes, now, now
    );
    
    return result.lastID || 0;
  }

  async updateCashRegister(id: number, register: Partial<CashRegister>): Promise<void> {
    const db = await dbPromise;
    const fields: string[] = [];
    const values: any[] = [];

    register.updatedAt = new Date().toISOString();

    Object.entries(register).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await db.run(`UPDATE cash_registers SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  // MOVIMIENTOS DE CAJA
  async getCashMovements(cashRegisterId: number): Promise<CashMovement[]> {
    const db = await dbPromise;
    return db.all('SELECT * FROM cash_movements WHERE cashRegisterId = ? ORDER BY createdAt DESC', cashRegisterId);
  }

  async addCashMovement(movement: Omit<CashMovement, 'id' | 'createdAt'>): Promise<number> {
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    const result = await db.run(
      `INSERT INTO cash_movements (
        cashRegisterId, type, amount, concept, invoiceId, expenseId,
        paymentMethod, userId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      movement.cashRegisterId, movement.type, movement.amount,
      movement.concept, movement.invoiceId, movement.expenseId,
      movement.paymentMethod, movement.userId, now
    );
    
    return result.lastID || 0;
  }

  async getTodayMovements(): Promise<CashMovement[]> {
    const db = await dbPromise;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartStr = todayStart.toISOString();
    
    return db.all('SELECT * FROM cash_movements WHERE createdAt >= ?', todayStartStr);
  }

  // EXPORTACIÓN E IMPORTACIÓN
  async exportToFile(): Promise<string> {
    try {
      const db = await dbPromise;
      
      // Recopilar todos los datos de la base de datos
      const users = await db.all('SELECT * FROM users');
      const products = await db.all('SELECT * FROM products');
      const customers = await db.all('SELECT * FROM customers');
      const invoices = await db.all('SELECT * FROM invoices');
      const invoiceLines = await db.all('SELECT * FROM invoice_lines');
      const expenses = await db.all('SELECT * FROM expenses');
      const cashRegisters = await db.all('SELECT * FROM cash_registers');
      const cashMovements = await db.all('SELECT * FROM cash_movements');
      
      // Crear el objeto de exportación
      const exportData = {
        users,
        products,
        customers,
        invoices,
        invoiceLines,
        expenses,
        cashRegisters,
        cashMovements,
        exportDate: new Date().toISOString(),
        version: '2.0'
      };
      
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
      
      // Validar los datos de importación
      if (!importData.users) {
        throw new Error('Formato de archivo inválido');
      }
      
      // Limpiar datos existentes - usar una transacción
      await db.run('BEGIN TRANSACTION');
      try {
        await db.run('DELETE FROM cash_movements');
        await db.run('DELETE FROM cash_registers');
        await db.run('DELETE FROM invoice_lines');
        await db.run('DELETE FROM invoices');
        await db.run('DELETE FROM expenses');
        await db.run('DELETE FROM customers');
        await db.run('DELETE FROM products');
        await db.run('DELETE FROM users');
        
        // Importar usuarios
        if (importData.users) {
          for (const user of importData.users) {
            await db.run(`
              INSERT INTO users (username, password, fullName, isAdmin, createdAt, lastLogin)
              VALUES (?, ?, ?, ?, ?, ?)
            `, user.username, user.password, user.fullName, user.isAdmin ? 1 : 0, user.createdAt, user.lastLogin);
          }
        }
        
        // Importar productos
        if (importData.products) {
          for (const product of importData.products) {
            await db.run(`
              INSERT INTO products (
                name, description, category, price, costPrice, stock, igicRate,
                isVisible, image, ingredients, size, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, product.name, product.description, product.category, product.price,
               product.costPrice, product.stock, product.igicRate, product.isVisible ? 1 : 0,
               product.image, product.ingredients, product.size, product.createdAt, product.updatedAt);
          }
        }
        
        // Importar clientes
        if (importData.customers) {
          for (const customer of importData.customers) {
            await db.run(`
              INSERT INTO customers (name, cif, email, phone, address, city, postalCode, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, customer.name, customer.cif, customer.email, customer.phone,
               customer.address, customer.city, customer.postalCode, customer.createdAt, customer.updatedAt);
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

  // INFORMES Y ESTADÍSTICAS
  async getSalesReport(startDate: string, endDate: string): Promise<any> {
    const db = await dbPromise;
    return db.get(`
      SELECT 
        COUNT(*) as totalInvoices,
        SUM(subtotal) as totalSubtotal,
        SUM(igic0) as totalIgic0,
        SUM(igic3) as totalIgic3,
        SUM(igic7) as totalIgic7,
        SUM(totalIgic) as totalIgic,
        SUM(total) as totalSales
      FROM invoices
      WHERE date >= ? AND date <= ? AND status != 'anulada'
    `, startDate, endDate);
  }

  async getExpensesReport(startDate: string, endDate: string): Promise<any> {
    const db = await dbPromise;
    return db.get(`
      SELECT 
        COUNT(*) as totalExpenses,
        SUM(subtotal) as totalSubtotal,
        SUM(igicAmount) as totalIgicSoportado,
        SUM(total) as totalExpenses
      FROM expenses
      WHERE date >= ? AND date <= ?
    `, startDate, endDate);
  }

  async getBestSellingProducts(startDate: string, endDate: string, limit: number = 10): Promise<any[]> {
    const db = await dbPromise;
    return db.all(`
      SELECT 
        il.productName,
        SUM(il.quantity) as totalQuantity,
        SUM(il.total) as totalRevenue
      FROM invoice_lines il
      JOIN invoices i ON il.invoiceId = i.id
      WHERE i.date >= ? AND i.date <= ? AND i.status != 'anulada'
      GROUP BY il.productName
      ORDER BY totalQuantity DESC
      LIMIT ?
    `, startDate, endDate, limit);
  }
}

export const db = new SQLiteDB();
