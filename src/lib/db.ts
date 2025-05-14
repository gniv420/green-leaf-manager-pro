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
  rfidCode?: string;  // Added rfidCode property
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
    // Usamos './data/club-database' para que se guarde en una carpeta 'data' en el directorio del proyecto
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
    
    // Add index for openedAt in cashRegisters
    this.version(4).stores({
      cashRegisters: "++id, openDate, closeDate, status, openedAt"
    });
    
    // Add index for rfidCode in members table
    this.version(5).stores({
      members: "++id, memberCode, dni, firstName, lastName, rfidCode, status"
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

  // Método para exportar la base de datos como un archivo SQLite
  async exportToFile(): Promise<string> {
    try {
      // Collect all data from the database
      const members = await this.members.toArray();
      const users = await this.users.toArray();
      const documents = await this.documents.toArray();
      const products = await this.products.toArray();
      const dispensary = await this.dispensary.toArray();
      const cashRegisters = await this.cashRegisters.toArray();
      const cashTransactions = await this.cashTransactions.toArray();
      const memberTransactions = await this.memberTransactions.toArray();
      
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
        exportDate: new Date(),
        version: '1.0'
      };
      
      // Convertir a JSON y guardar en localStorage para fácil acceso
      const jsonString = JSON.stringify(exportData);
      localStorage.setItem('club-database-export', jsonString);
      
      return jsonString;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Error al exportar los datos de la base de datos');
    }
  }

  // Método para importar datos desde un archivo JSON
  async importFromJson(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData);
      
      // Validate the import data
      if (!importData.members || !importData.users) {
        throw new Error('Formato de archivo inválido');
      }
      
      // Clear existing data
      await this.members.clear();
      await this.users.clear();
      
      // Clear other tables if they exist in import data
      if (importData.documents) await this.documents.clear();
      if (importData.products) await this.products.clear();
      if (importData.dispensary) await this.dispensary.clear();
      if (importData.cashRegisters) await this.cashRegisters.clear();
      if (importData.cashTransactions) await this.cashTransactions.clear();
      if (importData.memberTransactions) await this.memberTransactions.clear();
      
      // Import all data
      await this.transaction('rw', 
        this.members, 
        this.users, 
        this.documents, 
        this.products, 
        this.dispensary, 
        this.cashRegisters, 
        this.cashTransactions, 
        this.memberTransactions, 
        async () => {
          
        // Import members
        for (const member of importData.members) {
          await this.members.add({
            ...member,
            createdAt: new Date(member.createdAt),
            updatedAt: new Date(member.updatedAt),
            dob: new Date(member.dob),
            joinDate: new Date(member.joinDate)
          });
        }
        
        // Import users
        for (const user of importData.users) {
          await this.users.add({
            ...user,
            createdAt: new Date(user.createdAt),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
          });
        }
        
        // Import other data
        if (importData.documents) {
          for (const document of importData.documents) {
            await this.documents.add({
              ...document,
              uploadDate: new Date(document.uploadDate),
              createdAt: new Date(document.createdAt)
            });
          }
        }
        
        if (importData.products) {
          for (const product of importData.products) {
            await this.products.add({
              ...product,
              createdAt: new Date(product.createdAt),
              updatedAt: new Date(product.updatedAt)
            });
          }
        }
        
        if (importData.dispensary) {
          for (const item of importData.dispensary) {
            await this.dispensary.add({
              ...item,
              createdAt: new Date(item.createdAt)
            });
          }
        }
        
        if (importData.cashRegisters) {
          for (const register of importData.cashRegisters) {
            await this.cashRegisters.add({
              ...register,
              openDate: new Date(register.openDate),
              closeDate: register.closeDate ? new Date(register.closeDate) : undefined,
              openedAt: new Date(register.openedAt),
              closedAt: register.closedAt ? new Date(register.closedAt) : undefined
            });
          }
        }
        
        if (importData.cashTransactions) {
          for (const transaction of importData.cashTransactions) {
            await this.cashTransactions.add({
              ...transaction,
              createdAt: new Date(transaction.createdAt)
            });
          }
        }
        
        if (importData.memberTransactions) {
          for (const transaction of importData.memberTransactions) {
            await this.memberTransactions.add({
              ...transaction,
              createdAt: new Date(transaction.createdAt)
            });
          }
        }
      });
      
      console.log('Database import completed successfully');
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Error al importar los datos');
    }
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
