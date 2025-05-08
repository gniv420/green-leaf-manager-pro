
import Dexie, { Table } from 'dexie';

import { ProductType } from './product-types';
import type { Document, DocumentType } from './document-types';

export type { Document } from './document-types';

export interface User {
  id?: number;
  username: string;
  password: string;
  fullName: string;
  isAdmin: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Member {
  id?: number;
  memberCode: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  dob: Date;
  address: string;
  city: string;
  postalCode: string;
  joinDate: Date;
  consumptionGrams: number;
  notes?: string;
  status: 'active' | 'inactive' | 'pending';
  balance?: number;
  sponsorId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberTransaction {
  id?: number;
  memberId: number;
  amount: number;
  type: 'deposit' | 'withdrawal';
  notes?: string;
  userId: number;
  createdAt: Date;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  category: string;
  type: ProductType;
  price: number;
  costPrice?: number;
  stockGrams: number;
  isVisible?: boolean;
  image?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
}

export interface CashRegister {
  id?: number;
  openDate: Date;
  closeDate?: Date;
  initialBalance: number;
  finalBalance?: number;
  status: 'open' | 'closed';
  openingAmount: number;
  closingAmount?: number;
  userId: number;
  notes?: string;
  openedAt: Date;
  closedAt?: Date;
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
  createdAt: Date;
}

class ClubDatabase extends Dexie {
  members!: Table<Member>;
  products!: Table<Product>;
  dispensary!: Table<Dispensary>;
  cashRegisters!: Table<CashRegister>;
  cashTransactions!: Table<CashTransaction>;
  documents!: Table<Document>;
  users!: Table<User>;
  memberTransactions!: Table<MemberTransaction>;

  constructor() {
    super("ClubDatabase");
    
    this.version(1).stores({
      members: "++id, memberCode, dni, firstName, lastName, status",
      products: "++id, name, category, type",
      dispensary: "++id, memberId, productId, createdAt",
      cashRegisters: "++id, openDate, closeDate, status",
      cashTransactions: "++id, cashRegisterId, type, createdAt",
      users: "++id, username"
    });
    
    // Añadimos la tabla de documentos en la versión 2
    this.version(2).stores({
      documents: "++id, memberId, type, uploadDate"
    });

    // Añadimos la tabla de transacciones de miembros en la versión 3
    this.version(3).stores({
      memberTransactions: "++id, memberId, createdAt, type"
    });
  }

  // Helper method to generate member codes
  async generateMemberCode(firstName: string, lastName: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get first letters of first and last name
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    
    // Get count of members for sequential numbering
    const memberCount = await this.members.count();
    const sequentialNumber = (memberCount + 1).toString().padStart(3, '0');
    
    return `${year}${month}-${firstInitial}${lastInitial}${sequentialNumber}`;
  }

  // Method to export database as SQLite (stub for type checking)
  async exportAsSQLite(): Promise<Blob> {
    // This would be implemented with actual functionality
    console.log("Exporting database as SQLite...");
    return new Blob(['SQLite export data would go here'], { type: 'application/x-sqlite3' });
  }
}

export const db = new ClubDatabase();

db.on('populate', async () => {
  // Add initial admin user with password 1234
  await db.users.add({
    username: 'admin',
    password: '1234', // Changed from 'admin' to '1234'
    fullName: 'Administrator',
    isAdmin: true,
    createdAt: new Date()
  });

  const initialProducts = [
    {
      name: 'Amnesia Haze',
      category: 'Flor',
      type: 'sativa' as ProductType,
      price: 8.50,
      costPrice: 6.00,
      stockGrams: 50,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Critical Kush',
      description: 'Relajante y potente.',
      category: 'Flor',
      type: 'indica' as ProductType,
      price: 9.00,
      costPrice: 6.50,
      stockGrams: 30,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'White Widow',
      category: 'Flor',
      type: 'hibrido' as ProductType,
      price: 8.00,
      costPrice: 5.50,
      stockGrams: 40,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Gorilla Glue',
      category: 'Flor',
      type: 'hibrido' as ProductType,
      price: 9.50,
      costPrice: 7.00,
      stockGrams: 25,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Northern Lights',
      category: 'Flor',
      type: 'indica' as ProductType,
      price: 8.75,
      costPrice: 6.25,
      stockGrams: 35,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
  ];

  await db.products.bulkAdd(initialProducts);
});
