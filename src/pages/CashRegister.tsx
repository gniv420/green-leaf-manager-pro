
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CashRegister, CashTransaction } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CircleDollarSign, DollarSign, Coins } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const CashRegisterPage = () => {
  const { toast } = useToast();
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState<boolean>(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState<boolean>(false);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionConcept, setTransactionConcept] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bizum' | 'wallet'>('cash');
  
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.isAdmin === true;
  
  const currentCashRegister = useLiveQuery(() => {
    return db.cashRegisters
      .where('status')
      .equals('open')
      .first();
  });
  
  const cashRegisterHistory = useLiveQuery(() => {
    return db.cashRegisters
      .orderBy('openedAt')
      .reverse()
      .toArray();
  });
  
  const cashTransactions = useLiveQuery(async () => {
    if (!currentCashRegister?.id) return [];
    
    return await db.cashTransactions
      .where('cashRegisterId')
      .equals(currentCashRegister.id)
      .toArray();
  }, [currentCashRegister?.id]);
  
  const paymentMethodSummary = useLiveQuery(async () => {
    if (!currentCashRegister?.id) return null;
    
    const transactions = await db.cashTransactions
      .where('cashRegisterId')
      .equals(currentCashRegister.id)
      .toArray();
    
    return {
      cash: transactions
        .filter(t => t.type === 'income' && (t as any).paymentMethod === 'cash')
        .reduce((sum, t) => sum + t.amount, 0),
      bizum: transactions
        .filter(t => t.type === 'income' && (t as any).paymentMethod === 'bizum')
        .reduce((sum, t) => sum + t.amount, 0),
      wallet: transactions
        .filter(t => t.type === 'income' && (t as any).paymentMethod === 'wallet')
        .reduce((sum, t) => sum + t.amount, 0)
    };
  }, [currentCashRegister?.id]);
  
  const currentBalance = cashTransactions?.reduce((total, transaction) => {
    return total + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
  }, currentCashRegister?.openingAmount || 0) || 0;
  
  const handleOpenCashRegister = async () => {
    if (openingAmount <= 0) {
      toast({
        title: 'Error',
        description: 'El importe de apertura debe ser mayor que 0',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const userId = currentUser?.id || 1; // Default to admin if not set
      
      await db.cashRegisters.add({
        openingAmount,
        closingAmount: null,
        userId,
        status: 'open',
        notes,
        openedAt: new Date(),
        closedAt: null
      });
      
      toast({
        title: 'Caja abierta',
        description: 'La caja ha sido abierta correctamente'
      });
      
      setOpeningAmount(0);
      setNotes('');
      setIsOpenDialogOpen(false);
      
    } catch (error) {
      console.error('Error al abrir caja:', error);
      toast({
        title: 'Error',
        description: 'No se pudo abrir la caja',
        variant: 'destructive',
      });
    }
  };
  
  const handleCloseCashRegister = async () => {
    if (!currentCashRegister?.id) return;
    
    try {
      await db.cashRegisters.update(currentCashRegister.id, {
        closingAmount,
        status: 'closed',
        closedAt: new Date(),
        notes: currentCashRegister.notes + '\n\nCIERRE: ' + notes
      });
      
      toast({
        title: 'Caja cerrada',
        description: 'La caja ha sido cerrada correctamente'
      });
      
      setClosingAmount(0);
      setNotes('');
      setIsCloseDialogOpen(false);
      
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la caja',
        variant: 'destructive',
      });
    }
  };

  const handleAddTransaction = async () => {
    if (!currentCashRegister?.id) {
      toast({
        title: 'Error',
        description: 'No hay ninguna caja abierta',
        variant: 'destructive',
      });
      return;
    }

    if (transactionAmount <= 0) {
      toast({
        title: 'Error',
        description: 'El importe debe ser mayor que 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      await db.cashTransactions.add({
        type: transactionType,
        amount: transactionAmount,
        concept: transactionConcept,
        notes: transactionNotes,
        paymentMethod: paymentMethod,
        userId: currentUser?.id || 1,
        cashRegisterId: currentCashRegister.id,
        createdAt: new Date()
      });

      toast({
        title: 'Transacción registrada',
        description: 'La transacción ha sido registrada correctamente'
      });

      setTransactionAmount(0);
      setTransactionConcept('');
      setTransactionNotes('');
      setIsAddTransactionDialogOpen(false);
    } catch (error) {
      console.error('Error al añadir transacción:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar la transacción',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Caja</h1>
        {!currentCashRegister ? (
          <Button onClick={() => setIsOpenDialogOpen(true)}>
            <CircleDollarSign className="mr-2 h-4 w-4" />
            Abrir Caja
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button onClick={() => setIsAddTransactionDialogOpen(true)} variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Nueva Transacción
            </Button>
            <Button onClick={() => setIsCloseDialogOpen(true)} variant="destructive">
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Cerrar Caja
            </Button>
          </div>
        )}
      </div>
      
      {currentCashRegister ? (
        <Card>
          <CardHeader>
            <CardTitle>Estado Actual de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Apertura</p>
                  <p className="text-2xl font-bold">{currentCashRegister.openingAmount.toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(currentCashRegister.openedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Balance Actual</p>
                  <p className="text-2xl font-bold">{currentBalance.toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground">
                    {cashTransactions?.length || 0} transacciones
                  </p>
                </div>

                {paymentMethodSummary && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ingresos por método</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Coins className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Efectivo: <strong>{paymentMethodSummary.cash.toFixed(2)}€</strong></span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Bizum: <strong>{paymentMethodSummary.bizum.toFixed(2)}€</strong></span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Coins className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Monedero: <strong>{paymentMethodSummary.wallet.toFixed(2)}€</strong></span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total ingresos</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(paymentMethodSummary.cash + paymentMethodSummary.bizum + paymentMethodSummary.wallet).toFixed(2)}€
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No hay caja abierta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No hay ninguna caja abierta actualmente. Para registrar movimientos es necesario abrir una caja.
            </p>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="history">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="history">Historial de Cajas</TabsTrigger>
          <TabsTrigger value="transactions" disabled={!currentCashRegister}>Transacciones Actuales</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Apertura</TableHead>
                  <TableHead>Fecha Cierre</TableHead>
                  <TableHead>Importe Inicial</TableHead>
                  <TableHead>Importe Cierre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashRegisterHistory?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay registros de caja.
                    </TableCell>
                  </TableRow>
                )}
                {cashRegisterHistory?.map((register) => (
                  <TableRow key={register.id}>
                    <TableCell>
                      {format(new Date(register.openedAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell>
                      {register.closedAt
                        ? format(new Date(register.closedAt), 'dd/MM/yyyy HH:mm', { locale: es })
                        : '-'}
                    </TableCell>
                    <TableCell>{register.openingAmount.toFixed(2)}€</TableCell>
                    <TableCell>{register.closingAmount?.toFixed(2) || '-'}€</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          register.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {register.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="transactions">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashTransactions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay transacciones en la caja actual.
                    </TableCell>
                  </TableRow>
                )}
                {cashTransactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </TableCell>
                    <TableCell>{transaction.concept}</TableCell>
                    <TableCell>
                      {(transaction as any).paymentMethod === 'cash' && 'Efectivo'}
                      {(transaction as any).paymentMethod === 'bizum' && 'Bizum'}
                      {(transaction as any).paymentMethod === 'wallet' && 'Monedero'}
                      {!(transaction as any).paymentMethod && 'Efectivo'}
                    </TableCell>
                    <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}€
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Diálogo para abrir caja */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label htmlFor="openingAmount" className="block text-sm font-medium mb-1">
                Importe Inicial (€)
              </label>
              <Input
                id="openingAmount"
                type="number"
                step="0.01"
                min="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notas
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales para esta caja..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenCashRegister}>
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para cerrar caja */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Importe inicial: {currentCashRegister?.openingAmount.toFixed(2)}€</p>
              <p className="text-sm text-muted-foreground mb-4">Balance calculado: {currentBalance.toFixed(2)}€</p>
              
              <label htmlFor="closingAmount" className="block text-sm font-medium mb-1">
                Importe de Cierre (€)
              </label>
              <Input
                id="closingAmount"
                type="number"
                step="0.01"
                min="0"
                value={closingAmount}
                onChange={(e) => setClosingAmount(parseFloat(e.target.value) || 0)}
              />
              {closingAmount !== currentBalance && (
                <p className="text-xs text-amber-500 mt-1">
                  El importe de cierre no coincide con el balance calculado ({(closingAmount - currentBalance).toFixed(2)}€)
                </p>
              )}
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notas de Cierre
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales para el cierre de caja..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseCashRegister}>
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para añadir transacción */}
      <Dialog open={isAddTransactionDialogOpen} onOpenChange={setIsAddTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nueva Transacción</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-4">
              <Button
                variant={transactionType === 'income' ? 'default' : 'outline'}
                className={transactionType === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setTransactionType('income')}
                type="button"
                className="flex-1"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Ingreso
              </Button>
              <Button
                variant={transactionType === 'expense' ? 'default' : 'outline'}
                className={transactionType === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
                onClick={() => setTransactionType('expense')}
                type="button"
                className="flex-1"
              >
                <Coins className="mr-2 h-4 w-4" />
                Gasto
              </Button>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-1">
                Importe (€)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label htmlFor="concept" className="block text-sm font-medium mb-1">
                Concepto
              </label>
              <Input
                id="concept"
                value={transactionConcept}
                onChange={(e) => setTransactionConcept(e.target.value)}
                placeholder="Concepto de la transacción..."
              />
            </div>

            {transactionType === 'income' && (
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium mb-1">
                  Método de pago
                </label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(value) => setPaymentMethod(value as 'cash' | 'bizum' | 'wallet')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="bizum">Bizum</SelectItem>
                    <SelectItem value="wallet">Monedero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notas
              </label>
              <Textarea
                id="notes"
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTransactionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTransaction}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashRegisterPage;
