
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CashRegister } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CashRegister as CashRegisterIcon } from 'lucide-react';

const CashRegisterPage = () => {
  const { toast } = useToast();
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState<boolean>(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState<boolean>(false);
  
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
  
  const currentBalance = cashTransactions?.reduce((total, transaction) => {
    return total + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
  }, openingAmount) || 0;
  
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
      // En una aplicación real, obtendríamos el userId del contexto de autenticación
      const userId = 1; // Usando el admin por defecto
      
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
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Caja</h1>
        {!currentCashRegister ? (
          <Button onClick={() => setIsOpenDialogOpen(true)}>
            <CashRegisterIcon className="mr-2 h-4 w-4" />
            Abrir Caja
          </Button>
        ) : (
          <Button onClick={() => setIsCloseDialogOpen(true)} variant="destructive">
            <CashRegisterIcon className="mr-2 h-4 w-4" />
            Cerrar Caja
          </Button>
        )}
      </div>
      
      {currentCashRegister ? (
        <Card>
          <CardHeader>
            <CardTitle>Estado Actual de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
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
                  <TableHead>Importe</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashTransactions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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
    </div>
  );
};

export default CashRegisterPage;
