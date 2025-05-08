
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Search, Edit, Trash2 } from 'lucide-react';
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
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const products = useLiveQuery(
    async () => {
      const allProducts = await db.products.toArray();
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        return allProducts.filter(
          product => 
            product.name.toLowerCase().includes(lowerQuery) || 
            product.category.toLowerCase().includes(lowerQuery)
        );
      }
      return allProducts;
    },
    [searchQuery]
  );

  const form = useForm<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    defaultValues: {
      name: '',
      category: '',
      description: '',
      costPrice: 0,
      price: 0,
      stockGrams: 0,
    }
  });

  useEffect(() => {
    if (editingProduct) {
      form.reset({
        name: editingProduct.name,
        category: editingProduct.category,
        description: editingProduct.description,
        costPrice: editingProduct.costPrice || 0,
        price: editingProduct.price,
        stockGrams: editingProduct.stockGrams,
      });
    } else {
      form.reset({
        name: '',
        category: '',
        description: '',
        costPrice: 0,
        price: 0,
        stockGrams: 0,
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
      await db.products.delete(id);
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

  const onSubmit = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, {
          ...data,
          updatedAt: new Date()
        });
        toast({
          title: "Producto actualizado",
          description: "El producto ha sido actualizado correctamente",
        });
      } else {
        await db.products.add({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="mr-2" />
          Añadir Producto
        </Button>
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
                  <TableHead>Precio Coste</TableHead>
                  <TableHead>Precio Dispensación</TableHead>
                  <TableHead>Stock (g)</TableHead>
                  <TableHead>Beneficio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No hay productos registrados.
                    </TableCell>
                  </TableRow>
                )}
                {products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{(product.costPrice || 0).toFixed(2)}€</TableCell>
                    <TableCell>{product.price.toFixed(2)}€</TableCell>
                    <TableCell>
                      <span className={product.stockGrams < 10 ? "text-destructive font-medium" : ""}>
                        {product.stockGrams.toFixed(2)}g
                      </span>
                    </TableCell>
                    <TableCell>
                      {product.costPrice !== undefined ? (
                        ((product.price - product.costPrice) / product.costPrice * 100).toFixed(2) + "%"
                      ) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditDialog(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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
