
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSqliteQuery } from '@/hooks/useSqliteQuery';

const Dashboard = () => {
  // Consulta para obtener datos de miembros activos
  const [members, membersLoading, membersError] = useSqliteQuery(
    "SELECT * FROM members WHERE status = 'active'"
  );

  // Consulta para obtener datos de dispensario
  const [dispensary, dispensaryLoading, dispensaryError] = useSqliteQuery(
    "SELECT * FROM dispensary ORDER BY createdAt DESC LIMIT 10"
  );

  // Consulta para obtener datos de productos
  const [products, productsLoading, productsError] = useSqliteQuery(
    "SELECT * FROM products WHERE stockGrams < 20"
  );

  // Datos de ejemplo para el gráfico
  const chartData = [
    { name: 'Ene', ventas: 400 },
    { name: 'Feb', ventas: 600 },
    { name: 'Mar', ventas: 500 },
    { name: 'Abr', ventas: 700 },
    { name: 'May', ventas: 900 },
    { name: 'Jun', ventas: 800 },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Panel de Control</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de ventas */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Ventas Mensuales</h2>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Miembros activos */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Miembros Activos</h2>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <p>Cargando...</p>
            ) : membersError ? (
              <p className="text-red-500">Error: {membersError.message}</p>
            ) : (
              <div>
                <p className="text-3xl font-bold">{Array.isArray(members) ? members.length : 0}</p>
                <ul className="mt-4 space-y-2">
                  {Array.isArray(members) && members.slice(0, 5).map((member) => (
                    <li key={member.id} className="text-sm">
                      {member.firstName} {member.lastName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Dispensaciones recientes */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Dispensaciones Recientes</h2>
          </CardHeader>
          <CardContent>
            {dispensaryLoading ? (
              <p>Cargando...</p>
            ) : dispensaryError ? (
              <p className="text-red-500">Error: {dispensaryError.message}</p>
            ) : (
              <ul className="space-y-2">
                {Array.isArray(dispensary) && dispensary.slice(0, 5).map((item) => (
                  <li key={item.id} className="text-sm border-b pb-1">
                    <span className="font-medium">ID: {item.memberId}</span> - 
                    {item.quantity}g - €{item.price.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        {/* Productos con stock bajo */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Productos con Stock Bajo</h2>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <p>Cargando...</p>
            ) : productsError ? (
              <p className="text-red-500">Error: {productsError.message}</p>
            ) : (
              <ul className="space-y-2">
                {Array.isArray(products) && products.map((product) => (
                  <li key={product.id} className="text-sm border-b pb-1">
                    <span className="font-medium">{product.name}</span> - 
                    Stock: {product.stockGrams}g
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
