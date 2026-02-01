import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { Pizza, Receipt, TrendingUp, TrendingDown, Euro, ShoppingCart } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayInvoices: 0,
    todayExpenses: 0,
    totalProducts: 0,
    cashRegisterOpen: false,
    cashBalance: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener fecha de hoy
      const today = new Date().toISOString().split('T')[0];
      
      // Obtener productos
      const products = await db.getProducts();
      
      // Obtener facturas de hoy
      const invoices = await db.getInvoicesByDateRange(today, today);
      const paidInvoices = invoices.filter(inv => inv.status === 'pagada');
      const todaySales = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
      
      // Obtener gastos de hoy
      const expenses = await db.getExpensesByDateRange(today, today);
      const todayExpenses = expenses.reduce((sum, exp) => sum + exp.total, 0);
      
      // Verificar si hay caja abierta
      const cashRegister = await db.getOpenCashRegister();
      
      // Obtener últimas facturas (5 más recientes)
      const allInvoices = await db.getInvoices();
      const recent = allInvoices.slice(0, 5);
      
      setStats({
        todaySales,
        todayInvoices: paidInvoices.length,
        todayExpenses,
        totalProducts: products.length,
        cashRegisterOpen: !!cashRegister,
        cashBalance: cashRegister?.initialBalance || 0,
      });
      
      setRecentInvoices(recent);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : formatCurrency(stats.todaySales)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? '...' : `${stats.todayInvoices} facturas emitidas`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Hoy</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? '...' : formatCurrency(stats.todayExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gastos del día
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Pizza className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos en catálogo
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Caja</CardTitle>
            <Euro className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.cashRegisterOpen ? 'Abierta' : 'Cerrada'}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? '...' : stats.cashRegisterOpen ? formatCurrency(stats.cashBalance) : 'Sin caja activa'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturas Recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2">
            {loading ? (
              <p className="text-center p-4">Cargando facturas...</p>
            ) : recentInvoices.length === 0 ? (
              <p className="text-center p-4 text-muted-foreground">No hay facturas registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Nº Factura</th>
                      <th className="text-left p-4 font-medium">Cliente</th>
                      <th className="text-left p-4 font-medium">Fecha</th>
                      <th className="text-right p-4 font-medium">Base</th>
                      <th className="text-right p-4 font-medium">IGIC</th>
                      <th className="text-right p-4 font-medium">Total</th>
                      <th className="text-center p-4 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                        <td className="p-4">{invoice.customerName || 'Cliente General'}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(invoice.date).toLocaleDateString('es-ES')}
                        </td>
                        <td className="text-right p-4">{formatCurrency(invoice.subtotal)}</td>
                        <td className="text-right p-4 text-sm text-muted-foreground">
                          {formatCurrency(invoice.totalIgic)}
                        </td>
                        <td className="text-right p-4 font-semibold">{formatCurrency(invoice.total)}</td>
                        <td className="text-center p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'pagada' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ventas totales</span>
                <span className="text-lg font-semibold text-green-600">-</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gastos totales</span>
                <span className="text-lg font-semibold text-red-600">-</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Balance</span>
                <span className="text-lg font-bold">-</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center py-4">
                Estadísticas disponibles próximamente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
