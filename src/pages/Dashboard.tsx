
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, Member, CashRegister, Product } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, Database, Cannabis, CircleDollarSign, BarChart, DollarSign, Coins } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentCashRegister = useLiveQuery(() => {
    return db.cashRegisters
      .where('status')
      .equals('open')
      .first();
  });
  
  const todayTransactions = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const transactions = await db.cashTransactions
      .where('createdAt')
      .aboveOrEqual(today)
      .toArray();
    
    return transactions;
  });
  
  const todayIncome = todayTransactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
    
  const todayExpenses = todayTransactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
    
  const todayBalance = todayIncome - todayExpenses;
  
  const lowStockProducts = useLiveQuery(async () => {
    return db.products
      .where('stockGrams')
      .below(50)
      .toArray();
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get total counts
        const membersCount = await db.members.count();
        const usersCount = await db.users.count();
        
        // Get 5 most recent members
        const recent = await db.members
          .orderBy('createdAt')
          .reverse()
          .limit(5)
          .toArray();

        setTotalMembers(membersCount);
        setTotalUsers(usersCount);
        setRecentMembers(recent);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Cannabis className="h-6 w-6 text-green-600" />
          <span className="text-lg font-semibold">GreenLeaf Manager</span>
        </div>
      </div>
      
      {/* Estado de Caja */}
      <Card className={currentCashRegister ? 'border-green-500' : 'border-amber-500'}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <CircleDollarSign className={currentCashRegister ? 'text-green-500' : 'text-amber-500'} />
            Estado de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentCashRegister ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Caja abierta desde:</p>
                <p className="font-medium">{new Date(currentCashRegister.openedAt).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-2">Importe inicial:</p>
                <p className="font-bold">{currentCashRegister.openingAmount.toFixed(2)}€</p>
              </div>
              <Button asChild>
                <Link to="/cash-register">
                  Ver detalles
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <p className="text-amber-700">No hay caja abierta actualmente</p>
              <Button asChild>
                <Link to="/cash-register">
                  Abrir Caja
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Métricas clave */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Socios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Socios registrados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayIncome.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">
              Total de ingresos del día
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos hoy</CardTitle>
            <Coins className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{todayExpenses.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">
              Total de gastos del día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance hoy</CardTitle>
            <BarChart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${todayBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {todayBalance.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              Balance neto del día
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Socios recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Socios recientes</CardTitle>
            <CardDescription>
              Los últimos socios registrados en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentMembers.length > 0 ? (
              <div className="space-y-2">
                {recentMembers.map((member) => (
                  <Link
                    key={member.id}
                    to={`/members/${member.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
                  >
                    <div className="grid gap-1">
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono">{member.memberCode}</span> - DNI: {member.dni}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                No hay socios registrados todavía
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Productos con bajo stock */}
        <Card>
          <CardHeader>
            <CardTitle>Productos con bajo stock</CardTitle>
            <CardDescription>
              Productos con menos de 50g en inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <Link
                    key={product.id}
                    to="/inventory"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
                  >
                    <div className="grid gap-1">
                      <p className="font-medium">
                        {product.name}
                      </p>
                      <div className="text-sm text-muted-foreground">
                        {product.category}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      product.stockGrams < 10 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {product.stockGrams.toFixed(2)}g
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                No hay productos con bajo stock
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
