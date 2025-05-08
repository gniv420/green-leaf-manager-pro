
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

// Create the database class
class CannabisDexie extends Dexie {
  users!: Table<User>;
  members!: Table<Member>;
  documents!: Table<Document>;

  constructor() {
    super('cannabisAssociationDB');
    
    this.version(2).stores({
      users: '++id, username, createdAt',
      members: '++id, firstName, lastName, dni, sponsorId, createdAt', // Added createdAt index
      documents: '++id, memberId, createdAt'
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

    return sqlScript;
  }
}

// Export a single instance throughout the app
export const db = new CannabisDexie();
