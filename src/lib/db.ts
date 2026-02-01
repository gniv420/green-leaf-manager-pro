// Exportar tipos de datos
export type {
  User,
  Product,
  Customer,
  Invoice,
  InvoiceLine,
  Expense,
  CashRegister,
  CashMovement
} from './sqlite-db';

// Import SQLite database implementation
import { db as sqliteDb } from './sqlite-db';

// Export the database interface
export class PizzeriaDatabase {
  // USUARIOS
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

  // PRODUCTOS
  async getProducts() {
    return await sqliteDb.getProducts();
  }

  async getVisibleProducts() {
    return await sqliteDb.getVisibleProducts();
  }

  async getProductById(id: number) {
    return await sqliteDb.getProductById(id);
  }

  async getProductsByCategory(category: string) {
    return await sqliteDb.getProductsByCategory(category);
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

  // CLIENTES
  async getCustomers() {
    return await sqliteDb.getCustomers();
  }

  async getCustomerById(id: number) {
    return await sqliteDb.getCustomerById(id);
  }

  async addCustomer(customer: any) {
    return await sqliteDb.addCustomer(customer);
  }

  async updateCustomer(id: number, customer: any) {
    return await sqliteDb.updateCustomer(id, customer);
  }

  async deleteCustomer(id: number) {
    return await sqliteDb.deleteCustomer(id);
  }

  // FACTURAS
  async generateInvoiceNumber() {
    return await sqliteDb.generateInvoiceNumber();
  }

  async getInvoices() {
    return await sqliteDb.getInvoices();
  }

  async getInvoiceById(id: number) {
    return await sqliteDb.getInvoiceById(id);
  }

  async getInvoicesByDateRange(startDate: string, endDate: string) {
    return await sqliteDb.getInvoicesByDateRange(startDate, endDate);
  }

  async addInvoice(invoice: any) {
    return await sqliteDb.addInvoice(invoice);
  }

  async updateInvoice(id: number, invoice: any) {
    return await sqliteDb.updateInvoice(id, invoice);
  }

  async deleteInvoice(id: number) {
    return await sqliteDb.deleteInvoice(id);
  }

  // LÍNEAS DE FACTURA
  async getInvoiceLines(invoiceId: number) {
    return await sqliteDb.getInvoiceLines(invoiceId);
  }

  async addInvoiceLine(line: any) {
    return await sqliteDb.addInvoiceLine(line);
  }

  async deleteInvoiceLine(id: number) {
    return await sqliteDb.deleteInvoiceLine(id);
  }

  async deleteInvoiceLines(invoiceId: number) {
    return await sqliteDb.deleteInvoiceLines(invoiceId);
  }

  // GASTOS
  async getExpenses() {
    return await sqliteDb.getExpenses();
  }

  async getExpenseById(id: number) {
    return await sqliteDb.getExpenseById(id);
  }

  async getExpensesByDateRange(startDate: string, endDate: string) {
    return await sqliteDb.getExpensesByDateRange(startDate, endDate);
  }

  async addExpense(expense: any) {
    return await sqliteDb.addExpense(expense);
  }

  async updateExpense(id: number, expense: any) {
    return await sqliteDb.updateExpense(id, expense);
  }

  async deleteExpense(id: number) {
    return await sqliteDb.deleteExpense(id);
  }

  // CAJA
  async getOpenCashRegister() {
    return await sqliteDb.getOpenCashRegister();
  }

  async getCashRegisters() {
    return await sqliteDb.getCashRegisters();
  }

  async addCashRegister(register: any) {
    return await sqliteDb.addCashRegister(register);
  }

  async updateCashRegister(id: number, register: any) {
    return await sqliteDb.updateCashRegister(id, register);
  }

  // MOVIMIENTOS DE CAJA
  async getCashMovements(cashRegisterId: number) {
    return await sqliteDb.getCashMovements(cashRegisterId);
  }

  async addCashMovement(movement: any) {
    return await sqliteDb.addCashMovement(movement);
  }

  async getTodayMovements() {
    return await sqliteDb.getTodayMovements();
  }

  // EXPORTACIÓN E IMPORTACIÓN
  async exportToFile() {
    return await sqliteDb.exportToFile();
  }

  async importFromJson(jsonData: string) {
    return await sqliteDb.importFromJson(jsonData);
  }

  // INFORMES
  async getSalesReport(startDate: string, endDate: string) {
    return await sqliteDb.getSalesReport(startDate, endDate);
  }

  async getExpensesReport(startDate: string, endDate: string) {
    return await sqliteDb.getExpensesReport(startDate, endDate);
  }

  async getBestSellingProducts(startDate: string, endDate: string, limit?: number) {
    return await sqliteDb.getBestSellingProducts(startDate, endDate, limit);
  }
}

// Create and export a singleton instance
export const db = new PizzeriaDatabase();
