
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

// Configuración de la aplicación
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const DB_PATH = process.env.DB_PATH || './data/club.db';

// Asegurar que el directorio data existe
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Directorio creado: ${dataDir}`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Conexión a la base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite en:', DB_PATH);
    
    // Crear las tablas si no existen
    initializeDatabase();
  }
});

// Función para inicializar la base de datos
function initializeDatabase() {
  db.serialize(() => {
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      fullName TEXT NOT NULL,
      isAdmin INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      lastLogin TEXT
    )`);
    
    // Tabla de miembros
    db.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberCode TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      dni TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      dob TEXT NOT NULL,
      address TEXT,
      city TEXT,
      postalCode TEXT,
      joinDate TEXT NOT NULL,
      consumptionGrams REAL NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      balance REAL,
      sponsorId INTEGER,
      rfidCode TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);
    
    // Tabla de productos
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      costPrice REAL,
      stockGrams REAL NOT NULL,
      isVisible INTEGER,
      image TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);
    
    // Tabla dispensary
    db.run(`CREATE TABLE IF NOT EXISTS dispensary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    )`);
    
    // Tabla cash_registers
    db.run(`CREATE TABLE IF NOT EXISTS cash_registers (
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
      closedAt TEXT
    )`);
    
    // Tabla cash_transactions
    db.run(`CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashRegisterId INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      concept TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      paymentMethod TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`);
    
    // Tabla member_transactions
    db.run(`CREATE TABLE IF NOT EXISTS member_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberId INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    )`);
    
    // Tabla documents
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberId INTEGER NOT NULL,
      type TEXT NOT NULL,
      uploadDate TEXT NOT NULL,
      name TEXT NOT NULL,
      fileName TEXT NOT NULL,
      contentType TEXT NOT NULL,
      size INTEGER NOT NULL,
      filePath TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`);

    // Verificar si ya existe el usuario administrador
    db.get("SELECT COUNT(*) as count FROM users WHERE username = 'admin'", [], (err, row) => {
      if (err) {
        console.error('Error verificando usuario admin:', err.message);
        return;
      }
      
      if (row.count === 0) {
        // Crear usuario administrador inicial
        db.run(
          `INSERT INTO users (username, password, fullName, isAdmin, createdAt) 
           VALUES (?, ?, ?, ?, ?)`,
          ['admin', '1234', 'Administrator', 1, new Date().toISOString()],
          function(err) {
            if (err) {
              console.error('Error creando usuario admin:', err.message);
              return;
            }
            console.log('Usuario administrador creado con ID:', this.lastID);
          }
        );
      }
    });
    
    // Crear algunos productos de ejemplo si la tabla está vacía
    db.get("SELECT COUNT(*) as count FROM products", [], (err, row) => {
      if (err) {
        console.error('Error verificando productos:', err.message);
        return;
      }
      
      if (row.count === 0) {
        const initialProducts = [
          {
            name: 'Amnesia Haze',
            category: 'Flor',
            type: 'sativa',
            price: 8.50,
            costPrice: 6.00,
            stockGrams: 50,
            isVisible: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            name: 'Critical Kush',
            description: 'Relajante y potente.',
            category: 'Flor',
            type: 'indica',
            price: 9.00,
            costPrice: 6.50,
            stockGrams: 30,
            isVisible: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            name: 'White Widow',
            category: 'Flor',
            type: 'hibrido',
            price: 8.00,
            costPrice: 5.50,
            stockGrams: 40,
            isVisible: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        const stmt = db.prepare(
          `INSERT INTO products (name, description, category, type, price, costPrice, stockGrams, isVisible, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        
        initialProducts.forEach(product => {
          stmt.run([
            product.name,
            product.description || null,
            product.category,
            product.type,
            product.price,
            product.costPrice,
            product.stockGrams,
            product.isVisible,
            product.createdAt,
            product.updatedAt
          ]);
        });
        
        stmt.finalize();
        console.log('Productos de ejemplo creados');
      }
    });
  });
}

// Rutas API básicas

// Autenticación
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  const sql = `SELECT id, username, fullName, isAdmin FROM users WHERE username = ? AND password = ?`;
  
  db.get(sql, [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error en el servidor', 
        error: err.message 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // Actualizar la última conexión
    db.run(
      'UPDATE users SET lastLogin = ? WHERE id = ?',
      [new Date().toISOString(), user.id],
      (updateErr) => {
        if (updateErr) {
          console.error('Error actualizando último login:', updateErr.message);
        }
      }
    );
    
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        isAdmin: user.isAdmin === 1
      }
    });
  });
});

// Obtener miembros
app.get('/api/members', (req, res) => {
  const sql = `SELECT * FROM members ORDER BY firstName`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener miembros', 
        error: err.message 
      });
    }
    
    return res.json({
      success: true,
      members: rows
    });
  });
});

// Obtener un miembro por ID
app.get('/api/members/:id', (req, res) => {
  const sql = `SELECT * FROM members WHERE id = ?`;
  
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener el miembro', 
        error: err.message 
      });
    }
    
    if (!row) {
      return res.status(404).json({ 
        success: false, 
        message: 'Miembro no encontrado'
      });
    }
    
    return res.json({
      success: true,
      member: row
    });
  });
});

// Obtener productos
app.get('/api/products', (req, res) => {
  const sql = `SELECT * FROM products ORDER BY name`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener productos', 
        error: err.message 
      });
    }
    
    return res.json({
      success: true,
      products: rows
    });
  });
});

// Rutas para dispensary
app.get('/api/dispensary', (req, res) => {
  const sql = `
    SELECT d.*, m.firstName, m.lastName, p.name as productName 
    FROM dispensary d
    JOIN members m ON d.memberId = m.id
    JOIN products p ON d.productId = p.id
    ORDER BY d.createdAt DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener dispensary', 
        error: err.message 
      });
    }
    
    return res.json({
      success: true,
      dispensary: rows
    });
  });
});

// Ruta para todas las demás solicitudes - Servir la aplicación React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar el servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor ejecutándose en http://${HOST}:${PORT}`);
});

// Manejar cierre de la aplicación
process.on('SIGINT', () => {
  console.log('Cerrando la aplicación y la conexión a la base de datos');
  db.close((err) => {
    if (err) {
      console.error('Error al cerrar la base de datos:', err.message);
    }
    process.exit(0);
  });
});
