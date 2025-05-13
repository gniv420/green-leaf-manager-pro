
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
require('dotenv').config();

// Configuración de la aplicación
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const DB_PATH = process.env.DB_PATH || '/opt/club-manager/db/club.db';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Conexión a la base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite');
  }
});

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
      'UPDATE users SET lastLogin = datetime("now") WHERE id = ?',
      [user.id],
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
