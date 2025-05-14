
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSqliteQuery } from '@/hooks/useSqliteQuery';
import { db } from '@/lib/sqlite-db';

const Dashboard = () => {
  const [members, membersLoading] = useSqliteQuery(
    async () => {
      return await db.getMembers();
    },
    []
  );

  const [products, productsLoading] = useSqliteQuery(
    async () => {
      return await db.getProducts();
    }, 
    []
  );

  const [recentDispensations, dispensationsLoading] = useSqliteQuery(
    async () => {
      return await db.getRecentDispensations(5);
    },
    []
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Socios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {membersLoading ? '...' : members?.filter(m => m.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {membersLoading ? '...' : `De un total de ${members?.length || 0} socios`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos en Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productsLoading ? '...' : products?.filter(p => p.stockGrams > 0).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {productsLoading ? '...' : `De un total de ${products?.length || 0} productos`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gramos en Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productsLoading 
                ? '...' 
                : products?.reduce((acc, product) => acc + product.stockGrams, 0).toFixed(2) || 0}g
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dispensaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-8">
            {dispensationsLoading ? (
              <p className="text-center p-4">Cargando dispensaciones...</p>
            ) : recentDispensations?.length === 0 ? (
              <p className="text-center p-4">No hay dispensaciones recientes</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Socio</th>
                    <th className="text-left p-4">Producto</th>
                    <th className="text-left p-4">Cantidad</th>
                    <th className="text-right p-4">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDispensations?.map((dispensation) => (
                    <tr key={dispensation.id} className="border-b">
                      <td className="p-4">{dispensation.firstName} {dispensation.lastName}</td>
                      <td className="p-4">{dispensation.productName}</td>
                      <td className="p-4">{dispensation.quantity}g</td>
                      <td className="text-right p-4">{dispensation.price.toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
