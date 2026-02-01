import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { Expense } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, TrendingDown, Calendar } from 'lucide-react';

const Expenses = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    expenseNumber: '',
    supplier: '',
    supplierCif: '',
    date: new Date().toISOString().split('T')[0],
    concept: '',
    category: 'compra_mercancía' as 'compra_mercancía' | 'alquiler' | 'suministros' | 'servicios' | 'salarios' | 'otros',
    subtotal: '',
    igicRate: '7',
    paymentMethod: 'efectivo' as 'efectivo' | 'tarjeta' | 'transferencia' | 'domiciliación',
    status: 'pagado' as 'pagado' | 'pendiente',
    notes: '',
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const allExpenses = await db.getExpenses();
      setExpenses(allExpenses);
      setLoading(false);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los gastos',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        expenseNumber: expense.expenseNumber || '',
        supplier: expense.supplier,
        supplierCif: expense.supplierCif || '',
        date: expense.date.split('T')[0],
        concept: expense.concept,
        category: expense.category,
        subtotal: expense.subtotal.toString(),
        igicRate: expense.igicRate.toString(),
        paymentMethod: expense.paymentMethod,
        status: expense.status,
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        expenseNumber: '',
        supplier: '',
        supplierCif: '',
        date: new Date().toISOString().split('T')[0],
        concept: '',
        category: 'compra_mercancía',
        subtotal: '',
        igicRate: '7',
        paymentMethod: 'efectivo',
        status: 'pagado',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const calculateTotals = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const igicRate = parseFloat(formData.igicRate) || 0;
    const igicAmount = subtotal * (igicRate / 100);
    const total = subtotal + igicAmount;
    return { subtotal, igicAmount, total };
  };

  const handleSaveExpense = async () => {
    if (!formData.supplier || !formData.concept || !formData.subtotal) {
      toast({
        title: 'Error',
        description: 'Completa los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Error',
        description: 'No hay usuario autenticado',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { subtotal, igicAmount, total } = calculateTotals();

      const expenseData = {
        expenseNumber: formData.expenseNumber || undefined,
        supplier: formData.supplier,
        supplierCif: formData.supplierCif || undefined,
        date: new Date(formData.date).toISOString(),
        concept: formData.concept,
        category: formData.category,
        subtotal,
        igicRate: parseFloat(formData.igicRate),
        igicAmount,
        total,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        notes: formData.notes || undefined,
        userId: currentUser.id!,
      };

      if (editingExpense) {
        await db.updateExpense(editingExpense.id!, expenseData);
        toast({
          title: 'Gasto actualizado',
          description: 'El gasto se ha actualizado correctamente',
        });
      } else {
        await db.addExpense(expenseData);
        toast({
          title: 'Gasto registrado',
          description: 'El gasto se ha registrado correctamente',
        });
      }

      setDialogOpen(false);
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el gasto',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      return;
    }

    try {
      await db.deleteExpense(id);
      toast({
        title: 'Gasto eliminado',
        description: 'El gasto se ha eliminado correctamente',
      });
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el gasto',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'compra_mercancía': 'Compra Mercancía',
      'alquiler': 'Alquiler',
      'suministros': 'Suministros',
      'servicios': 'Servicios',
      'salarios': 'Salarios',
      'otros': 'Otros',
    };
    return labels[category] || category;
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingDown className="h-8 w-8" />
          Gastos
        </h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8">Cargando gastos...</p>
          ) : expenses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay gastos registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">IGIC</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.supplier}</p>
                        {expense.supplierCif && (
                          <p className="text-xs text-muted-foreground">{expense.supplierCif}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{expense.concept}</p>
                        {expense.expenseNumber && (
                          <p className="text-xs text-muted-foreground">Nº {expense.expenseNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(expense.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.subtotal)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCurrency(expense.igicAmount)}
                      <span className="ml-1">({expense.igicRate}%)</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(expense.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={expense.status === 'pagado' ? 'default' : 'secondary'}
                        className={expense.status === 'pagado' ? 'bg-green-600' : ''}
                      >
                        {expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(expense.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar gasto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor *</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierCif">CIF del Proveedor</Label>
                <Input
                  id="supplierCif"
                  value={formData.supplierCif}
                  onChange={(e) => setFormData({ ...formData, supplierCif: e.target.value })}
                  placeholder="B12345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseNumber">Nº Factura</Label>
                <Input
                  id="expenseNumber"
                  value={formData.expenseNumber}
                  onChange={(e) => setFormData({ ...formData, expenseNumber: e.target.value })}
                  placeholder="Nº de factura del proveedor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="concept">Concepto *</Label>
              <Input
                id="concept"
                value={formData.concept}
                onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                placeholder="Descripción del gasto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra_mercancía">Compra Mercancía</SelectItem>
                    <SelectItem value="alquiler">Alquiler</SelectItem>
                    <SelectItem value="suministros">Suministros</SelectItem>
                    <SelectItem value="servicios">Servicios</SelectItem>
                    <SelectItem value="salarios">Salarios</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="domiciliación">Domiciliación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subtotal">Base Imponible *</Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="igicRate">IGIC % *</Label>
                <Select
                  value={formData.igicRate}
                  onValueChange={(value) => setFormData({ ...formData, igicRate: value })}
                >
                  <SelectTrigger id="igicRate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exento)</SelectItem>
                    <SelectItem value="3">3% (Reducido)</SelectItem>
                    <SelectItem value="7">7% (General)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cálculo automático */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base Imponible:</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IGIC ({formData.igicRate}%):</span>
                  <span className="font-medium">{formatCurrency(totals.igicAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(totals.total)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales sobre el gasto"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveExpense}>
              {editingExpense ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
