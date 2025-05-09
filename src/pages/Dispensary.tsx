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
  Euro,
  UserRound,
  ChevronRight
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
import { normalizeDecimalInput, formatDecimal } from '@/lib/utils';
import MemberDispensaryHistory from '@/components/MemberDispensaryHistory';

// Helper function to safely format numbers
const formatNumber = (value: any): string => {
  const num = typeof value === 'number' ? value : Number(value);
  return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',');
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dispensaryToDelete, setDispensaryToDelete] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preselectedMemberId || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [desiredPrice, setDesiredPrice] = useState<number>(0);
  const [calculatedGrams, setCalculatedGrams] = useState<number>(0);
  const [actualGrams, setActualGrams] = useState<number>(0);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
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

  const members = useLiveQuery(
    () => {
      if (!memberSearchQuery) {
        return db.members.toArray();
      }
      
      const query = memberSearchQuery.toLowerCase();
      return db.members
        .filter(member => 
          member.firstName.toLowerCase().includes(query) ||
          member.lastName.toLowerCase().includes(query) ||
          member.memberCode.toLowerCase().includes(query) ||
          (member.rfidCode && member.rfidCode.toLowerCase().includes(query)) ||
          member.dni.toLowerCase().includes(query)
        )
        .toArray();
    },
    [memberSearchQuery]
  );
  
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
  
  useEffect(() => {
    if (preselectedMemberId) {
      form.setValue('memberId', preselectedMemberId);
      setSelectedMemberId(preselectedMemberId);
      
      if (!currentCashRegister) {
        toast({
          variant: 'default',
          title: 'Caja cerrada',
          description: 'Debes abrir una caja antes de realizar dispensaciones.'
        });
      }
    }
  }, [preselectedMemberId, form, toast, currentCashRegister]);

  // Detectar códigos RFID ingresados en el campo de búsqueda
  useEffect(() => {
    const checkForRfid = async () => {
      if (memberSearchQuery && memberSearchQuery.length >= 8) {
        // Buscar miembros con ese código RFID
        const memberWithRfid = members?.find(m => 
          m.rfidCode && m.rfidCode === memberSearchQuery
        );

        if (memberWithRfid) {
          // Seleccionar automáticamente al miembro
          selectMember(memberWithRfid);
          // Limpiar el campo de búsqueda
          setMemberSearchQuery('');
        }
      }
    };

    // Ejecutar la comprobación después de un breve retraso para permitir entrada completa
    const timer = setTimeout(checkForRfid, 100);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, members]);

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

  // Seleccionar un miembro
  const selectMember = (member: Member) => {
    if (member.id) {
      form.setValue('memberId', member.id.toString());
      setSelectedMemberId(member.id.toString());
      setMemberSearchQuery(''); // Clear search after selection
    }
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
      console.error('Error al eliminar dispensaci��n:', error);
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
      
      // Si el método de pago es monedero, actualizar el saldo del socio
      if (paymentMethod === 'wallet') {
        // Obtener socio actual
        const member = await db.members.get(memberId);
        if (member) {
          // Actualizar saldo (puede quedar negativo)
          const currentBalance = member.balance || 0;
          const newBalance = currentBalance - price;
          
          await db.members.update(memberId, {
            balance: newBalance,
            updatedAt: new Date()
          });
          
          // Registrar la transacción del socio
          await db.memberTransactions.add({
            memberId,
            amount: -price,  // Negativo porque es una salida
            type: 'withdrawal',
            notes: `Dispensación de ${product.name}`,
            userId: 1, // Admin por defecto
            createdAt: new Date()
          });
        }
      } else {
        // Registrar el pago en caja solo si es efectivo o bizum
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
      }
      
      // Limpiar formulario
      form.reset({
        memberId: '',
        paymentMethod: 'cash',
        desiredPrice: 0,
        calculatedGrams: 0,
        actualGrams: 0
      });
      
      setCart([]);
      setSelectedMemberId('');
      setDesiredPrice(0);
      setCalculatedGrams(0);
      setActualGrams(0);
      setMemberSearchQuery('');
      
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

  // Obtener el miembro seleccionado
  const selectedMember = useLiveQuery(
    () => {
      if (!selectedMemberId) return null;
      return db.members.get(parseInt(selectedMemberId));
    },
    [selectedMemberId]
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dispensario</h1>
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

      <div className="space-y-6">
        {/* Formulario de nueva dispensación */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Nueva Dispensación</CardTitle>
            <CardDescription>
              Complete los datos para registrar una nueva dispensación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Búsqueda de socio */}
                <div>
                  <FormLabel>Socio</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Buscar socio por nombre, código, DNI o RFID..."
                        className="pl-8"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {memberSearchQuery && members && members.length > 0 && !selectedMember && (
                      <Card className="relative mt-1 border shadow-md z-10 max-h-60 overflow-y-auto">
                        <CardContent className="p-0 divide-y">
                          {members.map((member) => (
                            <div
                              key={member.id}
                              className="p-2 cursor-pointer hover:bg-secondary/50 flex justify-between items-center"
                              onClick={() => selectMember(member)}
                            >
                              <div>
                                <p className="font-medium">{member.firstName} {member.lastName}</p>
                                <p className="text-xs text-muted-foreground">{member.memberCode} - {member.dni}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Mostrar socio seleccionado */}
                    {selectedMember && (
                      <div className="p-3 border rounded-md bg-secondary/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium flex items-center">
                              <UserRound className="h-4 w-4 mr-2" />
                              {selectedMember.firstName} {selectedMember.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedMember.memberCode} - {selectedMember.dni}
                            </p>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => {
                              setSelectedMemberId('');
                              form.setValue('memberId', '');
                            }}
                            size="sm"
                          >
                            Cambiar
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Hidden field to store member ID */}
                    <input type="hidden" {...form.register('memberId')} />
                  </div>
                </div>

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
                            <div className="font-medium text-sm truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatDecimal(product.price)}€/g
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stock: {formatDecimal(product.stockGrams)}g
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
                        Precio: {formatDecimal(cart[0].price)}€/g
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
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  if (!isNaN(value)) {
                                    field.onChange(value);
                                    updateDesiredPrice(value);
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
                                type="number"
                                readOnly
                                value={field.value || ""}
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
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  if (!isNaN(value)) {
                                    field.onChange(value);
                                    updateActualGrams(value);
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
                      <p className="font-medium mt-1">Precio por gramo: {formatDecimal(cart[0].price)}€</p>
                      <p className="font-medium mt-1">Cantidad a dispensar: {formatDecimal(actualGrams)}g</p>
                    </div>
                    <div className="text-lg font-bold">
                      Total: {formatDecimal(desiredPrice)}€
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Historial del socio seleccionado */}
        {selectedMember && (
          <Card className="shadow-sm mt-6">
            <CardHeader className="pb-3">
              <CardTitle>Historial de Dispensaciones del Socio</CardTitle>
              <CardDescription>
                Dispensaciones previas de {selectedMember.firstName} {selectedMember.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberDispensaryHistory memberId={parseInt(selectedMemberId)} />
            </CardContent>
          </Card>
        )}
        
        {/* Historial y resumen general */}
        <Card className="shadow-sm mt-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <CardTitle>Historial de Dispensaciones</CardTitle>
              <div className="relative w-full max-w-xs mt-2 sm:mt-0">
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
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">€</TableHead>
                    <TableHead></TableHead>
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
                    <TableRow key={record.id} className="cursor-pointer hover:bg-secondary/20">
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(record.createdAt, 'dd/MM HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-32">
                        {record.memberName}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-32">{record.productName}</TableCell>
                      <TableCell className="text-xs text-right">{formatDecimal(record.price)}</TableCell>
                      <TableCell className="text-right p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDeleteDispensary(record.id)}
                          className="h-6 w-6"
                        >
                          <Trash className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

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
