
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/lib/sqlite-db';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, Plus, Trash2, AlertTriangle, Eye, EyeOff, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/sqlite-db';
import { useSqliteQuery } from '@/hooks/useSqliteQuery';

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Use our custom useSqliteQuery hook instead of useLiveQuery
  const [products, isLoading, error] = useSqliteQuery<Product[]>(
    async () => {
      try {
        const allProducts = await db.getProducts();
        
        // Apply search filter if search query exists
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          return allProducts.filter(
            product => 
              product.name.toLowerCase().includes(lowerQuery) || 
              product.category.toLowerCase().includes(lowerQuery)
          );
        }
        return allProducts;
      } catch (error) {
        console.error("Error fetching products:", error);
        throw error;
      }
    },
    [searchQuery]
  );

  const form = useForm<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    defaultValues: {
      name: '',
      category: '',
      description: '',
      type: 'other',
      costPrice: 0,
      price: 0,
      stockGrams: 0,
      isVisible: true
    }
  });

  useEffect(() => {
    if (editingProduct) {
      form.reset({
        name: editingProduct.name,
        category: editingProduct.category,
        description: editingProduct.description || '',
        type: editingProduct.type || 'other',
        costPrice: editingProduct.costPrice || 0,
        price: editingProduct.price,
        stockGrams: editingProduct.stockGrams,
        isVisible: editingProduct.isVisible !== false // Default to true if not set
      });
    } else {
      form.reset({
        name: '',
        category: '',
        description: '',
        type: 'other',
        costPrice: 0,
        price: 0,
        stockGrams: 0,
        isVisible: true
      });
    }
  }, [editingProduct, form]);

  const handleOpenAddDialog = () => {
    setEditingProduct(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsAddDialogOpen(true);
  };

  const handleDeleteProduct = async (id: number | undefined) => {
    if (!id) return;
    
    try {
      await db.deleteProduct(id);
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  const toggleProductVisibility = async (product: Product) => {
    if (!product.id) return;

    try {
      const newVisibility = !product.isVisible;
      await db.updateProduct(product.id, {
        isVisible: newVisibility
      });

      toast({
        title: newVisibility ? "Producto visible" : "Producto oculto",
        description: `El producto ahora está ${newVisibility ? "visible" : "oculto"} en dispensario`,
      });
    } catch (error) {
      console.error("Error al cambiar visibilidad:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar la visibilidad del producto",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Ensure numeric values are properly converted to numbers
      const productData = {
        ...data,
        price: Number(data.price),
        costPrice: Number(data.costPrice),
        stockGrams: Number(data.stockGrams)
      };
      
      if (editingProduct?.id) {
        await db.updateProduct(editingProduct.id, productData);
        toast({
          title: "Producto actualizado",
          description: "El producto ha sido actualizado correctamente",
        });
      } else {
        await db.addProduct(productData);
        toast({
          title: "Producto añadido",
          description: "El nuevo producto ha sido añadido correctamente",
        });
      }
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive",
      });
    }
  };

  // Check if user has admin permissions
  const isAdmin = currentUser?.isAdmin === true;

  // Function to safely format numbers
  const formatNumber = (value: any): string => {
    const num = typeof value === 'number' ? value : Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error al cargar los productos: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        {isAdmin && (
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2" />
            Añadir Producto
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Gestión de Stock</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar productos..."
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio Dispensación</TableHead>
                  <TableHead>Stock (g)</TableHead>
                  <TableHead>Visible</TableHead>
                  {isAdmin && <TableHead>Precio Coste</TableHead>}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                      </div>
                      <div className="mt-2">Cargando productos...</div>
                    </TableCell>
                  </TableRow>
                ) : products && products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{formatNumber(product.price)}€</TableCell>
                      <TableCell>
                        <span className={product.stockGrams < 10 ? "text-destructive font-medium" : ""}>
                          {formatNumber(product.stockGrams)}g
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.isVisible !== false ? 
                          <span className="text-green-500">Visible</span> : 
                          <span className="text-red-500">Oculto</span>
                        }
                      </TableCell>
                      {isAdmin && (
                        <TableCell>{formatNumber(product.costPrice || 0)}€</TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => toggleProductVisibility(product)}
                          >
                            {product.isVisible !== false ? 
                              <EyeOff className="h-4 w-4" /> : 
                              <Eye className="h-4 w-4" />
                            }
                          </Button>
                          {isAdmin && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleOpenEditDialog(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                      No hay productos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre del producto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Flor, Extracto, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sativa">Sativa</SelectItem>
                        <SelectItem value="indica">Indica</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio de Coste (€)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio de Dispensación (€)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Descripción del producto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockGrams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock (gramos)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isVisible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Visible en dispensario</FormLabel>
                      <FormDescription>
                        Este producto será visible para dispensar
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{editingProduct ? 'Actualizar' : 'Añadir'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
