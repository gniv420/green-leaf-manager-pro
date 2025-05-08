
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { db, Dispensary as DispensaryRecord, Member, Product } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Cannabis, 
  Plus, 
  Search, 
  User, 
  Package, 
  DollarSign, 
  Hash, 
  Scale, 
  ArrowRight, 
  Trash, 
  AlertCircle,
  Euro
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Separator } from '@/components/ui/separator';

// Helper function to safely format numbers
const formatNumber = (value: any): string => {
  const num = typeof value === 'number' ? value : Number(value);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

// Improved helper function to normalize input with comma or dot
const normalizeDecimalInput = (value: string): number => {
  // Replace comma with dot for calculation
  const normalizedValue = value.replace(',', '.');
  return parseFloat(normalizedValue) || 0;
};

// Interfaz para los items en el carrito
interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
}

const Dispensary = () => {
  const [searchParams] = useSearchParams();
  const preselectedMemberId = searchParams.get('memberId');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dispensaryToDelete, setDispensaryToDelete] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preselectedMemberId || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [desiredPrice, setDesiredPrice] = useState<number>(0);
  const [calculatedGrams, setCalculatedGrams] = useState<number>(0);
  const [actualGrams, setActualGrams] = useState<number>(0);
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
  
  // Normalize product data to ensure numeric values
  const products = useLiveQuery(async () => {
    const allProducts = await db.products.toArray();
    
    // Ensure all products have proper number values for numeric fields
    return allProducts.map(product => ({
      ...product,
      price: typeof product.price === 'number' ? product.price : Number(product.price) || 0,
      stockGrams: typeof product.stockGrams === 'number' ? product.stockGrams : Number(product.stockGrams) || 0
    }));
  });

  // Productos filtrados por búsqueda
  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );
  
  // Obtenemos el registro de caja abierta para validar
  const currentCashRegister = useLiveQuery(() => {
    return db.cashRegisters
      .where('status')
      .equals('open')
      .first();
  });

  type FormValues = {
    memberId: string;
    paymentMethod: 'cash' | 'bizum' | 'wallet';
    desiredPrice: number;
    calculatedGrams: number;
    actualGrams: number;
  };

  const form = useForm<FormValues>({
    defaultValues: {
      memberId: preselectedMemberId || '',
      paymentMethod: 'cash',
      desiredPrice: 0,
      calculatedGrams: 0,
      actualGrams: 0
    }
  });
  
  // Actualizar el formulario si cambia el memberId preseleccionado
  useEffect(() => {
    if (preselectedMemberId) {
      form.setValue('memberId', preselectedMemberId);
      setSelectedMemberId(preselectedMemberId);
    }
  }, [preselectedMemberId, form]);

  // Calculate grams based on price when cart changes or desired price changes
  useEffect(() => {
    if (cart.length === 1 && desiredPrice > 0) {
      const product = cart[0];
      const calculatedAmount = desiredPrice / product.price;
      setCalculatedGrams(parseFloat(calculatedAmount.toFixed(2)));
      setActualGrams(parseFloat(calculatedAmount.toFixed(2)));
      form.setValue('calculatedGrams', parseFloat(calculatedAmount.toFixed(2)));
      form.setValue('actualGrams', parseFloat(calculatedAmount.toFixed(2)));
    }
  }, [cart, desiredPrice, form]);

  // Añadir producto al carrito
  const addToCart = (product: Product) => {
    // Clear the cart first to ensure only one product is selected
    setCart([{
      productId: product.id!,
      productName: product.name,
      price: product.price,
      quantity: 0.5
    }]);
    
    // Reset the form values for a new calculation
    setDesiredPrice(0);
    form.setValue('desiredPrice', 0);
    setCalculatedGrams(0);
    form.setValue('calculatedGrams', 0);
    setActualGrams(0);
    form.setValue('actualGrams', 0);
  };

  // Update the desired price and calculate grams
  const updateDesiredPrice = (value: number) => {
    setDesiredPrice(value);
    form.setValue('desiredPrice', value);
    
    if (cart.length === 1) {
      const product = cart[0];
      const calculatedAmount = value / product.price;
      setCalculatedGrams(parseFloat(calculatedAmount.toFixed(2)));
      form.setValue('calculatedGrams', parseFloat(calculatedAmount.toFixed(2)));
      // Also set the initial actual grams to match calculated
      setActualGrams(parseFloat(calculatedAmount.toFixed(2)));
      form.setValue('actualGrams', parseFloat(calculatedAmount.toFixed(2)));
    }
  };

  // Update the actual grams dispensed without changing the desired price
  const updateActualGrams = (value: number) => {
    setActualGrams(value);
    form.setValue('actualGrams', value);
    // Important: We don't update the desired price here - it stays the same
  };

  // Confirmar eliminación de dispensación
  const confirmDeleteDispensary = (dispensaryId?: number) => {
    if (!dispensaryId) return;
    setDispensaryToDelete(dispensaryId);
    setIsDeleteDialogOpen(true);
  };

  // Eliminar dispensación
  const handleDeleteDispensary = async () => {
    if (!dispensaryToDelete) return;
    
    try {
      // Obtener la dispensación a eliminar
      const dispensaryToRevert = await db.dispensary.get(dispensaryToDelete);
      if (!dispensaryToRevert) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se encontró la dispensación'
        });
        return;
      }
      
      // Revertir el stock
      const product = await db.products.get(dispensaryToRevert.productId);
      if (product) {
        const newStockGrams = Number(product.stockGrams) + Number(dispensaryToRevert.quantity);
        await db.products.update(product.id!, { 
          stockGrams: newStockGrams,
          updatedAt: new Date()
        });
      }
      
      // Si el método de pago era en efectivo o Bizum, registrar una salida de caja
      if (dispensaryToRevert.paymentMethod === 'cash' || dispensaryToRevert.paymentMethod === 'bizum') {
        if (currentCashRegister) {
          await db.cashTransactions.add({
            type: 'expense',
            amount: dispensaryToRevert.price,
            concept: `Devolución por dispensación eliminada`,
            notes: `ID dispensación: ${dispensaryToRevert.id}`,
            userId: 1, // Admin por defecto
            paymentMethod: dispensaryToRevert.paymentMethod,
            cashRegisterId: currentCashRegister.id,
            createdAt: new Date()
          });
        }
      }
      
      // Eliminar la dispensación
      await db.dispensary.delete(dispensaryToDelete);
      
      toast({
        title: 'Dispensación eliminada',
        description: 'La dispensación ha sido eliminada y el stock revertido'
      });
      
    } catch (error) {
      console.error('Error al eliminar dispensación:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la dispensación'
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDispensaryToDelete(null);
    }
  };

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

      // Verificar que haya un producto seleccionado
      if (cart.length === 0) {
        toast({
          title: "Error",
          description: "Seleccione un producto para dispensar",
          variant: "destructive",
        });
        return;
      }

      const memberId = parseInt(data.memberId);
      const productId = cart[0].productId;
      const actualGrams = data.actualGrams;
      const paymentMethod = data.paymentMethod;
      
      // Obtener el producto para verificar stock y precio
      const product = await db.products.get(productId);
      
      if (!product) {
        toast({
          title: "Error",
          description: "El producto seleccionado ya no existe",
          variant: "destructive",
        });
        return;
      }
      
      // Comprobar stock
      const stockGramsNum = typeof product.stockGrams === 'number' ? 
        product.stockGrams : Number(product.stockGrams) || 0;
      
      if (stockGramsNum < actualGrams) {
        toast({
          title: "Error",
          description: `No hay suficiente stock del producto seleccionado`,
          variant: "destructive",
        });
        return;
      }
      
      // Usar el precio deseado para el pago, no el calculado por gramos reales
      const price = data.desiredPrice;
      
      // Registrar dispensación
      const dispensaryId = await db.dispensary.add({
        memberId,
        productId,
        quantity: actualGrams,
        price,
        paymentMethod,
        notes: `Cantidad deseada: ${data.desiredPrice}€, Calculada: ${data.calculatedGrams}g, Dispensada: ${data.actualGrams}g`,
        userId: 1, // Admin por defecto
        createdAt: new Date()
      });
      
      // Actualizar stock del producto
      await db.products.update(productId, {
        stockGrams: stockGramsNum - actualGrams,
        updatedAt: new Date()
      });
      
      // Registrar el pago en caja
      await db.cashTransactions.add({
        type: 'income',
        amount: price,
        concept: `Dispensación de ${product.name}`,
        notes: `Para socio ID: ${memberId}`,
        userId: 1, // Admin por defecto
        paymentMethod,
        cashRegisterId: currentCashRegister.id,
        createdAt: new Date()
      });
      
      // Limpiar formulario y cerrar diálogo
      form.reset({
        memberId: data.memberId,
        paymentMethod: 'cash',
        desiredPrice: 0,
        calculatedGrams: 0,
        actualGrams: 0
      });
      
      setCart([]);
      setDesiredPrice(0);
      setCalculatedGrams(0);
      setActualGrams(0);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Dispensación registrada",
        description: "La dispensación ha sido registrada correctamente",
      });
      
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
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2" />
          Nueva Dispensación
        </Button>
      </div>

      {!currentCashRegister && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center text-amber-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p className="text-sm">
                <strong>Aviso:</strong> Para realizar dispensaciones es necesario tener una caja abierta. 
                Por favor, abra una caja primero en la sección de Gestión de Caja.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
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
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispensaryRecords?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
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
                    <TableCell>{formatNumber(record.quantity)}g</TableCell>
                    <TableCell className="text-right">{formatNumber(record.price)}€</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDeleteDispensary(record.id)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Dispensación</DialogTitle>
            <DialogDescription>
              Complete los datos para registrar una nueva dispensación.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Socio</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedMemberId(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Seleccionar socio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80">
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

              <div className="space-y-4 border rounded-md p-4">
                <h3 className="text-lg font-medium">Selección de producto</h3>
                <div className="relative w-full mb-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar producto..."
                    className="w-full pl-8"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts?.map((product) => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer hover:border-primary transition-all ${
                        cart.length > 0 && cart[0].productId === product.id
                          ? 'border-primary shadow-md' 
                          : 'shadow-sm'
                      }`}
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-2">
                        <div className="flex flex-col">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatNumber(product.price)}€/g
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Stock: {formatNumber(product.stockGrams)}g
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {cart.length > 0 && (
                  <div className="mt-4 p-4 bg-secondary/30 rounded-md">
                    <h4 className="font-medium mb-2">Producto seleccionado: {cart[0].productName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Precio: {formatNumber(cart[0].price)}€/g
                    </p>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="desiredPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad deseada (€)</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <Euro className="mr-2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="text" 
                              inputMode="decimal"
                              decimalInput={true}
                              value={field.value.toString()}
                              onChange={(e) => {
                                let inputValue = e.target.value;
                                
                                // Allow empty input (will be converted to 0)
                                if (inputValue === '') {
                                  field.onChange(0);
                                  updateDesiredPrice(0);
                                  return;
                                }
                                
                                // Normalize the input (replace comma with dot)
                                const normalizedValue = inputValue.replace(',', '.');
                                
                                // Only allow valid numeric input
                                if (!/^\d*\.?\d*$/.test(normalizedValue)) return;
                                
                                // Update the field with the parsed numeric value
                                const numValue = parseFloat(normalizedValue);
                                if (!isNaN(numValue)) {
                                  field.onChange(numValue);
                                  updateDesiredPrice(numValue);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Cantidad en euros que desea el socio
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="calculatedGrams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad calculada (g)</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <Scale className="mr-2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="text"
                              readOnly
                              value={field.value}
                              className="bg-muted"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Gramos calculados automáticamente
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualGrams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad real dispensada (g)</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <Scale className="mr-2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="text"
                              inputMode="decimal"
                              decimalInput={true}
                              value={field.value.toString()}
                              onChange={(e) => {
                                let inputValue = e.target.value;
                                
                                // Allow empty input
                                if (inputValue === '') {
                                  field.onChange(0);
                                  updateActualGrams(0);
                                  return;
                                }
                                
                                // Normalize the input (replace comma with dot)
                                const normalizedValue = inputValue.replace(',', '.');
                                
                                // Only allow valid numeric input
                                if (!/^\d*\.?\d*$/.test(normalizedValue)) return;
                                
                                // Parse and update
                                const numValue = parseFloat(normalizedValue);
                                if (!isNaN(numValue)) {
                                  field.onChange(numValue);
                                  updateActualGrams(numValue);
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Cantidad real dispensada en la balanza
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <DollarSign className="mr-2 h-4 w-4" />
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

              {cart.length > 0 && (
                <div className="flex justify-between items-center mt-4 p-4 bg-secondary/50 rounded-md">
                  <div className="text-sm">
                    <p className="font-medium">Producto: {cart[0].productName}</p>
                    <p className="font-medium mt-1">Precio por gramo: {formatNumber(cart[0].price)}€</p>
                    <p className="font-medium mt-1">Cantidad a dispensar: {formatNumber(actualGrams)}g</p>
                  </div>
                  <div className="text-lg font-bold">
                    Total: {formatNumber(desiredPrice)}€
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={
                    !form.watch('memberId') || 
                    cart.length === 0 ||
                    !form.watch('paymentMethod') ||
                    form.watch('actualGrams') <= 0 ||
                    !currentCashRegister
                  }
                >
                  <Cannabis className="mr-2 h-4 w-4" />
                  Completar Dispensación
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Estás seguro de que quieres eliminar esta dispensación? Esta acción revertirá el stock del producto y, si el pago fue en efectivo o Bizum, registrará una salida de caja.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteDispensary}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dispensary;
