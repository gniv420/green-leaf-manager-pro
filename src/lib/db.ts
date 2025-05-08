
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
    
    this.version(1).stores({
      users: '++id, username',
      members: '++id, firstName, lastName, dni, sponsorId',
      documents: '++id, memberId'
    });

    // Initialize with admin user if it doesn't exist
    this.on('ready', () => this.initializeAdminUser());
  }

  async initializeAdminUser() {
    const adminUser = await this.users.where('username').equals('admin').first();
    if (!adminUser) {
      await this.users.add({
        username: 'admin',
        password: '1234', // In a real app, this would be hashed
        isAdmin: true,
        createdAt: new Date()
      });
    }
  }
}

// Export a single instance throughout the app
export const db = new CannabisDexie();
