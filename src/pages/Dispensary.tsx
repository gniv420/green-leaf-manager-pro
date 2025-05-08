
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
  AlertCircle 
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';

// Helper function to safely format numbers
const formatNumber = (value: any): string => {
  const num = typeof value === 'number' ? value : Number(value);
  return isNaN(num) ? '0.00' : num.toFixed(2);
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
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [dispensaryMode, setDispensaryMode] = useState<'single' | 'multiple'>('single');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [actualQuantity, setActualQuantity] = useState<number>(1);
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

  const selectedProduct = products?.find(product => product.id === Number(selectedProductId));

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
    productId: string;
    paymentMethod: 'cash' | 'bizum' | 'wallet';
    quantity: number;
    actualQuantity: number;
  };

  const form = useForm<FormValues>({
    defaultValues: {
      memberId: preselectedMemberId || '',
      productId: '',
      paymentMethod: 'cash',
      quantity: 1,
      actualQuantity: 1
    }
  });
  
  // Actualizar el formulario si cambia el memberId preseleccionado
  useEffect(() => {
    if (preselectedMemberId) {
      form.setValue('memberId', preselectedMemberId);
      setSelectedMemberId(preselectedMemberId);
    }
  }, [preselectedMemberId, form]);

  // Añadir producto al carrito
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      // Verificar si el producto ya está en el carrito
      const existing = prevCart.find(item => item.productId === product.id);
      
      if (existing) {
        // Incrementar cantidad si ya existe
        return prevCart.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 0.5 } 
            : item
        );
      } else {
        // Añadir nuevo item al carrito
        return [...prevCart, {
          productId: product.id!,
          productName: product.name,
          price: product.price,
          quantity: 0.5
        }];
      }
    });
  };

  // Actualizar cantidad de un producto en el carrito
  const updateCartItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      // Eliminar el producto si la cantidad es 0 o menos
      setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    } else {
      // Actualizar la cantidad
      setCart(prevCart => 
        prevCart.map(item => 
          item.productId === productId 
            ? { ...item, quantity } 
            : item
        )
      );
    }
  };

  // Eliminar producto del carrito
  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  // Calcular total del carrito
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calcular precio para dispensación simple
  const calculateSinglePrice = (): number => {
    if (!selectedProduct || !quantity) return 0;
    return selectedProduct.price * quantity;
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

  const onSubmitSingle = async (data: FormValues) => {
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

      const memberId = parseInt(data.memberId);
      const productId = parseInt(data.productId);
      const requestedQuantity = data.quantity;
      const dispensedQuantity = data.actualQuantity;
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
      
      if (stockGramsNum < dispensedQuantity) {
        toast({
          title: "Error",
          description: `No hay suficiente stock del producto seleccionado`,
          variant: "destructive",
        });
        return;
      }
      
      // Calcular precio total
      const price = product.price * dispensedQuantity;
      
      // Registrar dispensación
      const dispensaryId = await db.dispensary.add({
        memberId,
        productId,
        quantity: dispensedQuantity,
        price,
        paymentMethod,
        notes: `Cantidad solicitada: ${requestedQuantity}g, Cantidad dispensada: ${dispensedQuantity}g`,
        userId: 1, // Admin por defecto
        createdAt: new Date()
      });
      
      // Actualizar stock del producto
      await db.products.update(productId, {
        stockGrams: stockGramsNum - dispensedQuantity,
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
        productId: '',
        paymentMethod: 'cash',
        quantity: 1,
        actualQuantity: 1
      });
      
      setSelectedProductId('');
      
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

  const onSubmitMultiple = async (data: FormValues) => {
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

      // Verificar que hay productos en el carrito
      if (cart.length === 0) {
        toast({
          title: "Error",
          description: "Añada productos al carrito para realizar la dispensación",
          variant: "destructive",
        });
        return;
      }
      
      // En una aplicación real, obtendríamos el userId del contexto de autenticación
      const userId = 1; // Usando el admin por defecto
      
      const memberId = parseInt(data.memberId);
      const paymentMethod = data.paymentMethod;
      
      // Procesar cada producto en el carrito
      for (const item of cart) {
        // Obtener el producto para verificar stock
        const product = await db.products.get(item.productId);
        
        if (!product) {
          toast({
            title: "Error",
            description: `El producto ${item.productName} ya no existe`,
            variant: "destructive",
          });
          continue;
        }
        
        // Ensure stockGrams is a number
        const stockGramsNum = typeof product.stockGrams === 'number' ? 
          product.stockGrams : Number(product.stockGrams) || 0;
        
        if (stockGramsNum < item.quantity) {
          toast({
            title: "Error",
            description: `No hay suficiente stock de ${item.productName}`,
            variant: "destructive",
          });
          continue;
        }
        
        // Calcular precio total por ítem
        const itemPrice = item.price * item.quantity;
        
        // Registrar dispensación
        await db.dispensary.add({
          memberId,
          productId: item.productId,
          quantity: item.quantity,
          price: itemPrice,
          paymentMethod,
          notes: `Dispensación múltiple - ${item.productName}`,
          userId,
          createdAt: new Date()
        });
        
        // Actualizar stock del producto
        await db.products.update(item.productId, {
          stockGrams: stockGramsNum - item.quantity,
          updatedAt: new Date()
        });
      }
      
      // Registrar el total como ingreso en caja
      await db.cashTransactions.add({
        type: 'income',
        amount: cartTotal,
        concept: `Dispensación múltiple`,
        notes: `Para socio ID: ${memberId}`,
        userId,
        paymentMethod,
        cashRegisterId: currentCashRegister.id,
        createdAt: new Date()
      });
      
      toast({
        title: "Dispensación registrada",
        description: "La dispensación múltiple ha sido registrada correctamente",
      });
      
      // Limpiar carrito y cerrar diálogo
      setCart([]);
      setIsAddDialogOpen(false);
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
          </DialogHeader>
          <Tabs defaultValue="single" className="mt-2" onValueChange={(value) => setDispensaryMode(value as any)}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="single">Dispensación Simple</TabsTrigger>
              <TabsTrigger value="multiple">Dispensación Múltiple</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitSingle)} className="space-y-4">
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

                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Producto</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedProductId(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="flex items-center">
                              <Package className="mr-2 h-4 w-4" />
                              <SelectValue placeholder="Seleccionar producto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-80">
                            {products?.map((product) => (
                              <SelectItem key={product.id} value={String(product.id)}>
                                {product.name} - {formatNumber(product.price)}€/g - Stock: {formatNumber(product.stockGrams)}g
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProduct && (
                          <div className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Stock disponible:</span> {formatNumber(selectedProduct.stockGrams)}g
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad a dispensar (g)</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Scale className="mr-2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="number" 
                                min="0.1" 
                                step="0.1" 
                                value={field.value}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  field.onChange(value);
                                  setQuantity(value);
                                  // También actualizar la cantidad dispensada
                                  const actualValue = form.getValues("actualQuantity") || 0;
                                  if (actualValue < value) {
                                    form.setValue("actualQuantity", value);
                                    setActualQuantity(value);
                                  }
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
                      name="actualQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad real dispensada (g)</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Scale className="mr-2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="number" 
                                min="0.1" 
                                step="0.1" 
                                value={field.value}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  field.onChange(value);
                                  setActualQuantity(value);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  <div className="flex justify-between items-center mt-4 p-4 bg-secondary/50 rounded-md">
                    <div className="text-sm">
                      <p className="font-medium">Precio por gramo: {selectedProduct ? formatNumber(selectedProduct.price) : '0.00'}€</p>
                      <p className="font-medium mt-1">Cantidad: {formatNumber(actualQuantity)}g</p>
                    </div>
                    <div className="text-lg font-bold">
                      Total: {formatNumber(calculateSinglePrice())}€
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={
                        !form.watch('memberId') || 
                        !form.watch('productId') || 
                        !form.watch('paymentMethod') ||
                        !currentCashRegister
                      }
                    >
                      <Cannabis className="mr-2 h-4 w-4" />
                      Completar Dispensación
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="multiple" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitMultiple)} className="space-y-4">
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
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Selección de productos</h3>
                      <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Buscar producto..."
                          className="w-full pl-8"
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredProducts?.map((product) => (
                        <Card 
                          key={product.id} 
                          className={`cursor-pointer hover:border-primary transition-all ${
                            cart.some(item => item.productId === product.id) 
                              ? 'border-primary shadow-md' 
                              : 'shadow-sm'
                          }`}
                          onClick={() => addToCart(product)}
                        >
                          <CardContent className="p-3">
                            <div className="flex flex-col">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatNumber(product.price)}€/g · 
                                Stock: {formatNumber(product.stockGrams)}g
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {cart.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="text-sm font-medium">Carrito de dispensación</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Precio/g</TableHead>
                                <TableHead>Cantidad (g)</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cart.map((item) => (
                                <TableRow key={item.productId}>
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell>{formatNumber(item.price)}€</TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Button 
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="px-2 py-0 h-7 w-7"
                                        onClick={() => updateCartItemQuantity(item.productId, item.quantity - 0.5)}
                                      >
                                        -
                                      </Button>
                                      <Input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        className="w-16 h-7"
                                        value={item.quantity}
                                        onChange={(e) => updateCartItemQuantity(
                                          item.productId, 
                                          parseFloat(e.target.value) || 0
                                        )}
                                      />
                                      <Button 
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="px-2 py-0 h-7 w-7"
                                        onClick={() => updateCartItemQuantity(item.productId, item.quantity + 0.5)}
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatNumber(item.price * item.quantity)}€
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => removeFromCart(item.productId)}
                                    >
                                      <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">
                                  Total:
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatNumber(cartTotal)}€
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>

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
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={
                        !form.watch('memberId') || 
                        !form.watch('paymentMethod') ||
                        cart.length === 0 ||
                        !currentCashRegister
                      }
                    >
                      <Cannabis className="mr-2 h-4 w-4" />
                      Completar Dispensación
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
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
