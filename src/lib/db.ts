import Dexie, { Table } from 'dexie';

import { ProductType } from './product-types';
import { Document } from './document-types';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  category: string;
  type: ProductType;
  price: number;
  stockGrams: number;
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
  notes?: string;
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

  constructor() {
    super("ClubDatabase");
    
    this.version(1).stores({
      members: "++id, memberCode, dni, firstName, lastName, status",
      products: "++id, name, category, type",
      dispensary: "++id, memberId, productId, createdAt",
      cashRegisters: "++id, openDate, closeDate, status",
      cashTransactions: "++id, cashRegisterId, type, createdAt"
    });
    
    // Añadimos la tabla de documentos en la versión 2
    this.version(2).stores({
      documents: "++id, memberId, type, uploadDate"
    });
  }
}

export const db = new ClubDatabase();

db.on('populate', async () => {
  const initialProducts = [
    {
      name: 'Amnesia Haze',
      category: 'Flor',
      type: 'sativa' as ProductType,
      price: 8.50,
      stockGrams: 50,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Critical Kush',
      description: 'Relajante y potente.',
      category: 'Flor',
      type: 'indica' as ProductType,
      price: 9.00,
      stockGrams: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'White Widow',
      category: 'Flor',
      type: 'hibrido' as ProductType,
      price: 8.00,
      stockGrams: 40,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Gorilla Glue',
      category: 'Flor',
      type: 'hibrido' as ProductType,
      price: 9.50,
      stockGrams: 25,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Northern Lights',
      category: 'Flor',
      type: 'indica' as ProductType,
      price: 8.75,
      stockGrams: 35,
      createdAt: new Date(),
      updatedAt: new Date()
    },
  ];

  await db.products.bulkAdd(initialProducts);
});
