import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { Product } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Minus, Trash2, ShoppingCart, Receipt, X } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
  igicAmount: number;
  total: number;
}

const Sales = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'bizum'>('efectivo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await db.getVisibleProducts();
      setProducts(allProducts);
      setLoading(false);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const categories = ['todas', 'pizza', 'bebida', 'entrante', 'postre', 'otro'];

  const filteredProducts = selectedCategory === 'todas' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id!, existingItem.quantity + 1);
    } else {
      const quantity = 1;
      const subtotal = product.price * quantity;
      const igicAmount = subtotal * (product.igicRate / 100);
      const total = subtotal + igicAmount;
      
      setCart([...cart, {
        product,
        quantity,
        subtotal,
        igicAmount,
        total,
      }]);
    }
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const subtotal = item.product.price * newQuantity;
        const igicAmount = subtotal * (item.product.igicRate / 100);
        const total = subtotal + igicAmount;
        
        return {
          ...item,
          quantity: newQuantity,
          subtotal,
          igicAmount,
          total,
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const igic0 = cart.filter(item => item.product.igicRate === 0).reduce((sum, item) => sum + item.igicAmount, 0);
    const igic3 = cart.filter(item => item.product.igicRate === 3).reduce((sum, item) => sum + item.igicAmount, 0);
    const igic7 = cart.filter(item => item.product.igicRate === 7).reduce((sum, item) => sum + item.igicAmount, 0);
    const totalIgic = cart.reduce((sum, item) => sum + item.igicAmount, 0);
    const total = cart.reduce((sum, item) => sum + item.total, 0);

    return { subtotal, igic0, igic3, igic7, totalIgic, total };
  };

  const processIgicDetails = () => {
    const baseIgic0 = cart.filter(item => item.product.igicRate === 0).reduce((sum, item) => sum + item.subtotal, 0);
    const baseIgic3 = cart.filter(item => item.product.igicRate === 3).reduce((sum, item) => sum + item.subtotal, 0);
    const baseIgic7 = cart.filter(item => item.product.igicRate === 7).reduce((sum, item) => sum + item.subtotal, 0);
    
    const igic0 = baseIgic0 * 0;
    const igic3 = baseIgic3 * 0.03;
    const igic7 = baseIgic7 * 0.07;

    return { igic0, igic3, igic7 };
  };

  const handleCreateInvoice = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Carrito vacío',
        description: 'Añade productos al carrito antes de crear una factura',
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
      const totals = calculateTotals();
      const igicDetails = processIgicDetails();
      const now = new Date().toISOString();

      // Crear factura
      const invoiceId = await db.addInvoice({
        customerName: customerName || 'Cliente General',
        date: now,
        subtotal: totals.subtotal,
        igic0: igicDetails.igic0,
        igic3: igicDetails.igic3,
        igic7: igicDetails.igic7,
        totalIgic: totals.totalIgic,
        total: totals.total,
        paymentMethod,
        status: 'pagada',
        userId: currentUser.id!,
      });

      // Crear líneas de factura
      for (const item of cart) {
        await db.addInvoiceLine({
          invoiceId,
          productId: item.product.id!,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
          igicRate: item.product.igicRate,
          subtotal: item.subtotal,
          igicAmount: item.igicAmount,
          total: item.total,
        });
      }

      // Registrar en caja si está abierta y el pago es en efectivo
      const openCashRegister = await db.getOpenCashRegister();
      if (openCashRegister && paymentMethod === 'efectivo') {
        await db.addCashMovement({
          cashRegisterId: openCashRegister.id!,
          type: 'venta',
          amount: totals.total,
          concept: `Venta - Factura`,
          invoiceId,
          paymentMethod,
          userId: currentUser.id!,
        });
      }

      toast({
        title: 'Factura creada',
        description: `Factura creada exitosamente. Total: ${formatCurrency(totals.total)}`,
      });

      clearCart();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la factura',
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

  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Punto de Venta
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Productos */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtro de categorías */}
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="capitalize"
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Grid de productos */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <p className="col-span-full text-center py-8">Cargando productos...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="col-span-full text-center py-8 text-muted-foreground">
                    No hay productos en esta categoría
                  </p>
                ) : (
                  filteredProducts.map(product => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {product.igicRate}%
                          </Badge>
                        </div>
                        {product.size && (
                          <p className="text-xs text-muted-foreground capitalize">{product.size}</p>
                        )}
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(product.price)}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Carrito */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Carrito
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items del carrito */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Carrito vacío
                  </p>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-2 p-2 rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.product.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id!, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id!, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeFromCart(item.product.id!)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-semibold text-sm">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <Separator />

              {/* Detalles del cliente */}
              <div className="space-y-2">
                <Label htmlFor="customerName">Cliente (opcional)</Label>
                <Input
                  id="customerName"
                  placeholder="Nombre del cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="bizum">Bizum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Totales */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.igic0 > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGIC 0%</span>
                    <span>{formatCurrency(totals.igic0)}</span>
                  </div>
                )}
                {totals.igic3 > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGIC 3%</span>
                    <span>{formatCurrency(totals.igic3)}</span>
                  </div>
                )}
                {totals.igic7 > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGIC 7%</span>
                    <span>{formatCurrency(totals.igic7)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totals.total)}</span>
                </div>
              </div>

              {/* Botón de cobrar */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleCreateInvoice}
                disabled={cart.length === 0}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Cobrar {formatCurrency(totals.total)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sales;
