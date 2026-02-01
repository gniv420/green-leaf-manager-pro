import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { Invoice, Expense } from '@/lib/db';
import { FileBarChart, TrendingUp, TrendingDown, Calculator, Download } from 'lucide-react';

const Reports = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [salesReport, setSalesReport] = useState<any>(null);
  const [expensesReport, setExpensesReport] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bestProducts, setBestProducts] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Cargar informes de ventas
      const sales = await db.getSalesReport(startDate, endDate);
      setSalesReport(sales);
      
      // Cargar informes de gastos
      const exp = await db.getExpensesReport(startDate, endDate);
      setExpensesReport(exp);
      
      // Cargar facturas del periodo
      const inv = await db.getInvoicesByDateRange(startDate, endDate);
      setInvoices(inv.filter(i => i.status !== 'anulada'));
      
      // Cargar gastos del periodo
      const expenses = await db.getExpensesByDateRange(startDate, endDate);
      setExpenses(expenses);
      
      // Cargar productos más vendidos
      const products = await db.getBestSellingProducts(startDate, endDate, 10);
      setBestProducts(products);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los informes',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const calculateBalance = () => {
    const totalSales = salesReport?.totalSales || 0;
    const totalExpenses = expensesReport?.totalExpenses || 0;
    return totalSales - totalExpenses;
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-8 w-8" />
          Informes Contables
        </h1>
      </div>

      {/* Selector de fechas */}
      <Card>
        <CardHeader>
          <CardTitle>Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={loadReports} disabled={loading}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen general */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(salesReport?.totalSales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesReport?.totalInvoices || 0} facturas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(expensesReport?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expensesReport?.totalExpenses || 0} registros
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${calculateBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(calculateBalance())}
            </div>
            <p className="text-xs text-muted-foreground">
              Resultado del periodo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes informes */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Libro de Ventas</TabsTrigger>
          <TabsTrigger value="expenses">Libro de Compras</TabsTrigger>
          <TabsTrigger value="igic">Resumen IGIC</TabsTrigger>
          <TabsTrigger value="products">Productos Vendidos</TabsTrigger>
        </TabsList>

        {/* Libro de Ventas */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Libro de Ventas</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(invoices, 'libro-ventas')}
                  disabled={invoices.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay ventas en este periodo
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">IGIC</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{formatDate(invoice.date)}</TableCell>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customerName || 'Cliente General'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.subtotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.totalIgic)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(invoice.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(salesReport?.totalSubtotal || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(salesReport?.totalIgic || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(salesReport?.totalSales || 0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Libro de Compras */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Libro de Compras y Gastos</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(expenses, 'libro-compras')}
                  disabled={expenses.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay gastos en este periodo
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">IGIC Soportado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{expense.supplier}</TableCell>
                        <TableCell>{expense.concept}</TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.subtotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.igicAmount)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(expense.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(expensesReport?.totalSubtotal || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expensesReport?.totalIgicSoportado || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(expensesReport?.totalExpenses || 0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resumen IGIC */}
        <TabsContent value="igic">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>IGIC Repercutido (Ventas)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGIC 0%:</span>
                  <span className="font-semibold">{formatCurrency(salesReport?.totalIgic0 || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGIC 3%:</span>
                  <span className="font-semibold">{formatCurrency(salesReport?.totalIgic3 || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGIC 7%:</span>
                  <span className="font-semibold">{formatCurrency(salesReport?.totalIgic7 || 0)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t font-bold">
                  <span>Total IGIC Repercutido:</span>
                  <span className="text-primary">{formatCurrency(salesReport?.totalIgic || 0)}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>IGIC Soportado (Compras)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGIC Soportado:</span>
                  <span className="font-semibold">{formatCurrency(expensesReport?.totalIgicSoportado || 0)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span>IGIC Repercutido:</span>
                  <span>{formatCurrency(salesReport?.totalIgic || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGIC Soportado:</span>
                  <span>-{formatCurrency(expensesReport?.totalIgicSoportado || 0)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t font-bold">
                  <span>IGIC a Ingresar:</span>
                  <span className="text-primary">
                    {formatCurrency((salesReport?.totalIgic || 0) - (expensesReport?.totalIgicSoportado || 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productos más vendidos */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bestProducts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay datos de productos en este periodo
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad Vendida</TableHead>
                      <TableHead className="text-right">Ingresos Totales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bestProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell className="text-right">{product.totalQuantity}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(product.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
