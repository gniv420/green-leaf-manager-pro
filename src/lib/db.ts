
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

// Import SQLite database implementation
import { db as sqliteDb } from './sqlite-db';

// Export the database interface with its collection-like API to mimic Dexie
export class ClubDatabase {
  // Mimic the Dexie collection structure for backward compatibility
  users = {
    get: async (id: number) => await sqliteDb.getUserById(id),
    where: (field: string) => ({
      equals: async (value: any) => {
        if (field === 'username') {
          const user = await sqliteDb.getUserByUsername(value);
          return {
            first: async () => user
          };
        }
        return { first: async () => null };
      }
    }),
    toArray: async () => await sqliteDb.getUsers(),
    add: async (user: any) => await sqliteDb.addUser(user),
    update: async (id: number, user: any) => await sqliteDb.updateUser(id, user),
    delete: async (id: number) => await sqliteDb.deleteUser(id)
  };

  members = {
    get: async (id: number) => await sqliteDb.getMemberById(id),
    where: (field: string) => ({
      equals: async (value: any) => {
        if (field === 'rfidCode') {
          const member = await sqliteDb.getMemberByRfid(value);
          return {
            first: async () => member
          };
        }
        return { first: async () => null };
      }
    }),
    toArray: async () => await sqliteDb.getMembers(),
    add: async (member: any) => await sqliteDb.addMember(member),
    update: async (id: number, member: any) => await sqliteDb.updateMember(id, member),
    delete: async (id: number) => await sqliteDb.deleteMember(id)
  };

  products = {
    toArray: async () => await sqliteDb.getProducts(),
    get: async (id: number) => await sqliteDb.getProductById(id),
    add: async (product: any) => await sqliteDb.addProduct(product),
    update: async (id: number, product: any) => await sqliteDb.updateProduct(id, product),
    delete: async (id: number) => await sqliteDb.deleteProduct(id),
    where: (field: string) => ({
      equals: async (value: any) => {
        if (field === 'isVisible') {
          const products = value ? await sqliteDb.getVisibleProducts() : [];
          return {
            toArray: async () => products
          };
        }
        return { toArray: async () => [] };
      }
    }),
  };

  dispensary = {
    toArray: async () => await sqliteDb.getDispensaryRecords(),
    where: (field: string) => ({
      equals: async (value: any) => {
        if (field === 'memberId') {
          const records = await sqliteDb.getDispensaryForMember(value);
          return {
            toArray: async () => records
          };
        }
        return { toArray: async () => [] };
      }
    }),
    add: async (record: any) => await sqliteDb.addDispensaryRecord(record),
    delete: async (id: number) => await sqliteDb.deleteDispensary(id)
  };

  documents = {
    where: (field: string) => ({
      equals: async (value: any) => {
        if (field === 'memberId') {
          const docs = await sqliteDb.getDocuments(value);
          return {
            toArray: async () => docs
          };
        }
        return { toArray: async () => [] };
      }
    }),
    add: async (document: any) => await sqliteDb.addDocument(document),
    get: async (id: number) => await sqliteDb.getDocumentById(id),
    delete: async (id: number) => await sqliteDb.deleteDocument(id)
  };

  memberTransactions = {
    where: (field: string) => ({
      equals: async (value: any) => {
        if (field === 'memberId') {
          const transactions = await sqliteDb.getMemberTransactions(value);
          return {
            toArray: async () => transactions,
            reverse: () => ({
              sortBy: async (sortField: string) => transactions.sort((a, b) => {
                if (sortField === 'createdAt') {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return 0;
              })
            })
          };
        }
        return { 
          toArray: async () => [],
          reverse: () => ({
            sortBy: async () => []
          })
        };
      }
    }),
    add: async (transaction: any) => await sqliteDb.addMemberTransaction(transaction)
  };

  cashTransactions = {
    where: (field: string) => ({
      equals: async (value: any) => {
        if (field === 'cashRegisterId') {
          const transactions = await sqliteDb.getCashTransactions(value);
          return {
            toArray: async () => transactions
          };
        }
        return { toArray: async () => [] };
      }
    }),
    add: async (transaction: any) => await sqliteDb.addCashTransaction(transaction)
  };

  // Method to generate member codes
  async generateMemberCode(firstName: string, lastName: string): Promise<string> {
    return await sqliteDb.generateMemberCode(firstName, lastName);
  }

  // Direct methods from SQLite database
  async getOpenCashRegister() {
    return await sqliteDb.getOpenCashRegister();
  }

  async getCashRegisters() {
    return await sqliteDb.getCashRegisters();
  }

  async getCashTransactions(cashRegisterId: number) {
    return await sqliteDb.getCashTransactions(cashRegisterId);
  }

  async addCashRegister(register: any) {
    return await sqliteDb.addCashRegister(register);
  }

  async updateCashRegister(id: number, register: any) {
    return await sqliteDb.updateCashRegister(id, register);
  }

  async addCashTransaction(transaction: any) {
    return await sqliteDb.addCashTransaction(transaction);
  }

  async getUsers() {
    return await sqliteDb.getUsers();
  }

  async getUserById(id: number) {
    return await sqliteDb.getUserById(id);
  }

  async getUserByUsername(username: string) {
    return await sqliteDb.getUserByUsername(username);
  }

  async addUser(user: any) {
    return await sqliteDb.addUser(user);
  }

  async updateUser(id: number, user: any) {
    return await sqliteDb.updateUser(id, user);
  }

  async deleteUser(id: number) {
    return await sqliteDb.deleteUser(id);
  }

  async getMembers() {
    return await sqliteDb.getMembers();
  }

  async getMemberById(id: number) {
    return await sqliteDb.getMemberById(id);
  }

  async getMemberByRfid(rfidCode: string) {
    return await sqliteDb.getMemberByRfid(rfidCode);
  }

  async addMember(member: any) {
    return await sqliteDb.addMember(member);
  }

  async updateMember(id: number, member: any) {
    return await sqliteDb.updateMember(id, member);
  }

  async deleteMember(id: number) {
    return await sqliteDb.deleteMember(id);
  }

  async getProducts() {
    return await sqliteDb.getProducts();
  }

  async getVisibleProducts() {
    return await sqliteDb.getVisibleProducts();
  }

  async getProductById(id: number) {
    return await sqliteDb.getProductById(id);
  }

  async addProduct(product: any) {
    return await sqliteDb.addProduct(product);
  }

  async updateProduct(id: number, product: any) {
    return await sqliteDb.updateProduct(id, product);
  }

  async deleteProduct(id: number) {
    return await sqliteDb.deleteProduct(id);
  }

  async getDispensaryRecords() {
    return await sqliteDb.getDispensaryRecords();
  }

  async getDispensaryForMember(memberId: number) {
    return await sqliteDb.getDispensaryForMember(memberId);
  }

  async addDispensaryRecord(record: any) {
    return await sqliteDb.addDispensaryRecord(record);
  }

  async getRecentDispensations(limit: number) {
    return await sqliteDb.getRecentDispensations(limit);
  }

  async getMemberTransactions(memberId: number) {
    return await sqliteDb.getMemberTransactions(memberId);
  }

  async addMemberTransaction(transaction: any) {
    return await sqliteDb.addMemberTransaction(transaction);
  }

  async getDocuments(memberId: number) {
    return await sqliteDb.getDocuments(memberId);
  }

  async addDocument(document: any) {
    return await sqliteDb.addDocument(document);
  }

  async deleteDocument(id: number) {
    return await sqliteDb.deleteDocument(id);
  }

  async getDocumentById(id: number) {
    return await sqliteDb.getDocumentById(id);
  }

  async exportToFile() {
    return await sqliteDb.exportToFile();
  }

  async importFromJson(jsonData: string) {
    return await sqliteDb.importFromJson(jsonData);
  }

  async deleteDispensary(id: number) {
    return await sqliteDb.deleteDispensary(id);
  }
}

// Create and export a singleton instance
export const db = new ClubDatabase();

// Export type only, not the conflicting interface
export type { CashRegister as CashRegisterType, CashTransaction as CashTransactionType } from './sqlite-db';
