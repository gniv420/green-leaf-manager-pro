
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { db, Dispensary as DispensaryRecord, Member, Product } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Cannabis, Plus, Search, User, Package, DollarSign, Hash, Scale, ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FormDescription,
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

const Dispensary = () => {
  const [searchParams] = useSearchParams();
  const preselectedMemberId = searchParams.get('memberId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const dispensaryRecords = useLiveQuery(
    async () => {
      const allRecords = await db.dispensary.toArray();
      // Obtener todos los miembros y productos para mostrar sus nombres
      const members = await db.members.toArray();
      const products = await db.products.toArray();
      
      const recordsWithDetails = await Promise.all(
        allRecords.map(async (record) => {
          const member = members.find(m => m.id === record.memberId);
          const product = products.find(p => p.id === record.productId);
          
          return {
            ...record,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Desconocido',
            memberCode: member?.memberCode || '',
            productName: product ? product.name : 'Desconocido',
          };
        })
      );
      
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        return recordsWithDetails.filter(
          record => 
            record.memberName.toLowerCase().includes(lowerQuery) || 
            record.memberCode.toLowerCase().includes(lowerQuery) ||
            record.productName.toLowerCase().includes(lowerQuery)
        );
      }
      
      return recordsWithDetails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    [searchQuery]
  );

  const members = useLiveQuery(() => db.members.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  
  // Obtenemos el registro de caja abierta para validar
  const currentCashRegister = useLiveQuery(() => {
    return db.cashRegisters
      .where('status')
      .equals('open')
      .first();
  });

  type FormValues = {
    memberId: string;
    productId: string;
    amountEuros: number;
    calculatedGrams: number;
    actualGrams: number;
    notes: string;
    paymentMethod: 'cash' | 'bizum' | 'wallet';
  };

  const form = useForm<FormValues>({
    defaultValues: {
      memberId: preselectedMemberId || '',
      productId: '',
      amountEuros: 0,
      calculatedGrams: 0,
      actualGrams: 0,
      notes: '',
      paymentMethod: 'cash'
    }
  });
  
  // Actualizar el formulario si cambia el memberId preseleccionado
  useEffect(() => {
    if (preselectedMemberId) {
      form.setValue('memberId', preselectedMemberId);
    }
  }, [preselectedMemberId, form]);

  const watchProductId = form.watch('productId');
  const watchAmountEuros = form.watch('amountEuros');
  
  const selectedProduct = useLiveQuery(
    async () => {
      if (!watchProductId) return null;
      return await db.products.get(parseInt(watchProductId));
    },
    [watchProductId]
  );
  
  // Calcular los gramos en base al precio del producto seleccionado
  useEffect(() => {
    if (selectedProduct && watchAmountEuros > 0) {
      const calculatedGrams = selectedProduct.price > 0 ? 
        watchAmountEuros / selectedProduct.price : 0;
      form.setValue('calculatedGrams', parseFloat(calculatedGrams.toFixed(2)));
      form.setValue('actualGrams', parseFloat(calculatedGrams.toFixed(2)));
    } else {
      form.setValue('calculatedGrams', 0);
      form.setValue('actualGrams', 0);
    }
  }, [selectedProduct, watchAmountEuros, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Verificar si hay una caja abierta
      if (!currentCashRegister) {
        toast({
          title: "Error",
          description: "Debe abrir una caja antes de hacer dispensaciones",
          variant: "destructive",
        });
        return;
      }
      
      // En una aplicación real, obtendríamos el userId del contexto de autenticación
      const userId = 1; // Usando el admin por defecto
      
      const productId = parseInt(data.productId);
      const memberId = parseInt(data.memberId);
      const actualGrams = data.actualGrams;
      
      // Obtain the selected payment method
      const paymentMethod = data.paymentMethod;
      
      // Obtener el producto para verificar stock y precio
      const product = await db.products.get(productId);
      
      if (!product) {
        toast({
          title: "Error",
          description: "El producto no existe",
          variant: "destructive",
        });
        return;
      }
      
      if (product.stockGrams < actualGrams) {
        toast({
          title: "Error",
          description: "No hay suficiente stock disponible",
          variant: "destructive",
        });
        return;
      }
      
      // Registrar dispensación con el importe en euros
      await db.dispensary.add({
        memberId,
        productId,
        quantity: actualGrams, // Ahora usamos los gramos reales dispensados
        price: data.amountEuros, // Ahora guardamos el precio en euros que ha pagado
        paymentMethod,
        notes: data.notes,
        userId,
        createdAt: new Date()
      });
      
      // Actualizar stock del producto con los gramos reales dispensados
      await db.products.update(productId, {
        stockGrams: product.stockGrams - actualGrams,
        updatedAt: new Date()
      });
      
      // Registrar como ingreso en caja
      await db.cashTransactions.add({
        type: 'income',
        amount: data.amountEuros, // Usamos el importe en euros
        concept: `Dispensación ${product.name}`,
        notes: `Para socio ID: ${memberId}`,
        userId,
        paymentMethod,
        cashRegisterId: currentCashRegister.id,
        createdAt: new Date()
      });
      
      toast({
        title: "Dispensación registrada",
        description: "La dispensación ha sido registrada correctamente",
      });
      
      setIsAddDialogOpen(false);
      form.reset();
      // Mantener el miembro seleccionado si vino por parámetro
      if (preselectedMemberId) {
        form.setValue('memberId', preselectedMemberId);
      }
      
    } catch (error) {
      console.error("Error al registrar la dispensación:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la dispensación",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dispensario</h1>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          disabled={!currentCashRegister}
        >
          <Plus className="mr-2" />
          Nueva Dispensación
        </Button>
      </div>

      {!currentCashRegister && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center text-amber-800">
              <p className="text-sm">
                <strong>Aviso:</strong> Para realizar dispensaciones es necesario tener una caja abierta. 
                Por favor, abra una caja primero en la sección de Gestión de Caja.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Dispensaciones</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar dispensaciones..."
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
                  <TableHead>Código</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispensaryRecords?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay dispensaciones registradas.
                    </TableCell>
                  </TableRow>
                )}
                {dispensaryRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(record.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="font-mono">{record.memberCode}</TableCell>
                    <TableCell className="font-medium">{record.memberName}</TableCell>
                    <TableCell>{record.productName}</TableCell>
                    <TableCell>{record.quantity.toFixed(2)}g</TableCell>
                    <TableCell className="text-right">{record.price.toFixed(2)}€</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Dispensación</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Socio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Seleccionar socio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members?.map((member) => (
                          <SelectItem key={member.id} value={String(member.id)}>
                            {member.memberCode} - {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="flex items-center">
                          <Package className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name} - {product.stockGrams.toFixed(2)}g disponibles
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProduct && (
                      <FormDescription className="mt-1">
                        Precio: {selectedProduct.price}€/g · 
                        Stock disponible: {selectedProduct.stockGrams.toFixed(2)}g
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="amountEuros"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Importe (euros)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            {...field} 
                            className="pl-8"
                            type="number" 
                            step="0.01" 
                            min="0" 
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              field.onChange(val);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calculatedGrams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad calculada (gramos)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            {...field} 
                            className="pl-8"
                            type="number" 
                            step="0.01" 
                            readOnly
                            disabled
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Cantidad calculada según el precio por gramo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actualGrams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gramos reales dispensados</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Scale className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            {...field} 
                            className="pl-8"
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max={selectedProduct?.stockGrams || 0}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              if (selectedProduct && val > selectedProduct.stockGrams) {
                                toast({
                                  title: "Advertencia",
                                  description: "La cantidad supera el stock disponible",
                                  variant: "destructive",
                                });
                                return;
                              }
                              field.onChange(val);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Introduzca los gramos reales que se han dispensado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="bizum">Bizum</SelectItem>
                        <SelectItem value="wallet">Monedero</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={
                    !form.watch('memberId') || 
                    !form.watch('productId') || 
                    !form.watch('paymentMethod') ||
                    form.watch('amountEuros') <= 0 || 
                    form.watch('actualGrams') <= 0 ||
                    !currentCashRegister
                  }
                >
                  <Cannabis className="mr-2 h-4 w-4" />
                  Registrar Dispensación
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dispensary;
