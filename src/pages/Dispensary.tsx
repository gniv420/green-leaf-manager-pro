
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Dispensary as DispensaryRecord, Member, Product } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Cannabis, Plus, Search } from 'lucide-react';
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
            productName: product ? product.name : 'Desconocido',
          };
        })
      );
      
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        return recordsWithDetails.filter(
          record => 
            record.memberName.toLowerCase().includes(lowerQuery) || 
            record.productName.toLowerCase().includes(lowerQuery)
        );
      }
      
      return recordsWithDetails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    [searchQuery]
  );

  const members = useLiveQuery(() => db.members.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  type FormValues = {
    memberId: string;
    productId: string;
    quantity: number;
    notes: string;
  };

  const form = useForm<FormValues>({
    defaultValues: {
      memberId: '',
      productId: '',
      quantity: 0,
      notes: '',
    }
  });

  const watchProductId = form.watch('productId');
  
  const selectedProduct = useLiveQuery(
    async () => {
      if (!watchProductId) return null;
      return await db.products.get(parseInt(watchProductId));
    },
    [watchProductId]
  );

  const onSubmit = async (data: FormValues) => {
    try {
      // En una aplicación real, obtendríamos el userId del contexto de autenticación
      const userId = 1; // Usando el admin por defecto
      
      const productId = parseInt(data.productId);
      const memberId = parseInt(data.memberId);
      const quantity = data.quantity;
      
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
      
      if (product.stockGrams < quantity) {
        toast({
          title: "Error",
          description: "No hay suficiente stock disponible",
          variant: "destructive",
        });
        return;
      }
      
      // Registrar dispensación
      await db.dispensary.add({
        memberId,
        productId,
        quantity,
        price: product.price * quantity,
        notes: data.notes,
        userId,
        createdAt: new Date()
      });
      
      // Actualizar stock del producto
      await db.products.update(productId, {
        stockGrams: product.stockGrams - quantity,
        updatedAt: new Date()
      });
      
      // Registrar como ingreso en caja
      await db.cashTransactions.add({
        type: 'income',
        amount: product.price * quantity,
        concept: `Dispensación ${product.name}`,
        notes: `Para socio ID: ${memberId}`,
        userId,
        createdAt: new Date()
      });
      
      toast({
        title: "Dispensación registrada",
        description: "La dispensación ha sido registrada correctamente",
      });
      
      setIsAddDialogOpen(false);
      form.reset();
      
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
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2" />
          Nueva Dispensación
        </Button>
      </div>

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
                  <TableHead>Socio</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispensaryRecords?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No hay dispensaciones registradas.
                    </TableCell>
                  </TableRow>
                )}
                {dispensaryRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(record.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
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
        <DialogContent className="sm:max-w-[450px]">
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
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar socio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members?.map((member) => (
                          <SelectItem key={member.id} value={String(member.id)}>
                            {member.firstName} {member.lastName} - {member.dni}
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
                        <SelectTrigger>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedProduct && (
                <div className="text-sm text-muted-foreground">
                  <p>Precio: {selectedProduct.price}€/g</p>
                  <p>Stock disponible: {selectedProduct.stockGrams.toFixed(2)}g</p>
                </div>
              )}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad (gramos)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max={selectedProduct?.stockGrams || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedProduct && form.watch('quantity') > 0 && (
                <div className="text-sm font-medium">
                  Total a pagar: {(selectedProduct.price * form.watch('quantity')).toFixed(2)}€
                </div>
              )}
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
                <Button 
                  type="submit" 
                  disabled={!form.watch('memberId') || !form.watch('productId') || form.watch('quantity') <= 0}
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
