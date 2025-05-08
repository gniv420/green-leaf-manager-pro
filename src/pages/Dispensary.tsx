
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { db, Dispensary as DispensaryRecord, Member, Product } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Cannabis, Plus, Search, User, Package, DollarSign, Hash, Scale, ArrowRight, Trash } from 'lucide-react';
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
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preselectedMemberId || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
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
  };

  const form = useForm<FormValues>({
    defaultValues: {
      memberId: preselectedMemberId || '',
      paymentMethod: 'cash'
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
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        // Añadir nuevo item al carrito
        return [...prevCart, {
          productId: product.id!,
          productName: product.name,
          price: product.price,
          quantity: 1
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
                    <TableCell>{formatNumber(record.quantity)}g</TableCell>
                    <TableCell className="text-right">{formatNumber(record.price)}€</TableCell>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredProducts?.map((product) => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer hover:border-primary ${
                        cart.some(item => item.productId === product.id) 
                          ? 'border-primary' 
                          : ''
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dispensary;
