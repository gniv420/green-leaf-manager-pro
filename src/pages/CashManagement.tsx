
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CashTransaction } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Cash, Plus, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CashManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const transactions = useLiveQuery(
    async () => {
      const allTransactions = await db.cashTransactions.toArray();
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        return allTransactions.filter(
          transaction => 
            transaction.concept.toLowerCase().includes(lowerQuery) || 
            transaction.notes.toLowerCase().includes(lowerQuery)
        );
      }
      return allTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    [searchQuery]
  );

  const currentBalance = useLiveQuery(
    async () => {
      const allTransactions = await db.cashTransactions.toArray();
      return allTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          return acc + transaction.amount;
        } else {
          return acc - transaction.amount;
        }
      }, 0);
    }
  );

  const form = useForm<Omit<CashTransaction, 'id' | 'createdAt' | 'userId'>>({
    defaultValues: {
      type: 'income',
      amount: 0,
      concept: '',
      notes: '',
    }
  });

  const onSubmit = async (data: Omit<CashTransaction, 'id' | 'createdAt' | 'userId'>) => {
    try {
      // En una aplicación real, obtendríamos el userId del contexto de autenticación
      const userId = 1; // Usando el admin por defecto
      
      await db.cashTransactions.add({
        ...data,
        userId,
        createdAt: new Date()
      });
      
      toast({
        title: "Transacción registrada",
        description: "La transacción ha sido registrada correctamente",
      });
      
      setIsAddDialogOpen(false);
      form.reset();
      
    } catch (error) {
      console.error("Error al registrar la transacción:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la transacción",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Caja</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2" />
          Nueva Transacción
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Actual</CardTitle>
            <Cash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBalance?.toFixed(2) || '0.00'}€</div>
            <p className="text-xs text-muted-foreground">Actualizado en tiempo real</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Registro de Transacciones</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar transacciones..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay transacciones registradas.
                    </TableCell>
                  </TableRow>
                )}
                {transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(transaction.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'income' ? (
                        <div className="flex items-center">
                          <ArrowUpCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span>Ingreso</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <ArrowDownCircle className="h-4 w-4 text-destructive mr-2" />
                          <span>Gasto</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.concept}</TableCell>
                    <TableCell>{transaction.notes}</TableCell>
                    <TableCell className={`text-right ${transaction.type === 'income' ? 'text-green-500' : 'text-destructive'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}€
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Transacción</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Transacción</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Ingreso</SelectItem>
                        <SelectItem value="expense">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe (€)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="concept"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concepto</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Concepto de la transacción" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Notas adicionales" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Registrar Transacción</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashManagement;
