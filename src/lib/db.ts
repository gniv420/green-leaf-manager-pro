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

// Export the database interface
export class ClubDatabase {
  // Forward SQLite methods for cash register operations
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

  // Add other methods needed by the application
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

// Re-export SQLite types for convenience
export type { CashRegister, CashTransaction } from './sqlite-db';
