
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Cannabis, CircleDollarSign, BarChart, DollarSign, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db, Member, Dispensary } from '@/lib/sqlite-db';
import { useSqliteQuery } from '@/hooks/useSqliteQuery';

const Dashboard = () => {
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Consultar el estado de la caja con useSqliteQuery
  const { data: currentCashRegister, isLoading: isLoadingCashRegister } = useSqliteQuery({
    queryKey: ['cashRegister', 'open'],
    queryFn: async () => {
      return await db.getOpenCashRegister();
    }
  });
  
  // Consultar las transacciones de hoy con useSqliteQuery
  const { data: todayTransactions, isLoading: isLoadingTransactions } = useSqliteQuery({
    queryKey: ['cashTransactions', 'today'],
    queryFn: async () => {
      return await db.getTodayTransactions();
    }
  });
  
  const todayIncome = todayTransactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
    
  const todayExpenses = todayTransactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
    
  const todayBalance = todayIncome - todayExpenses;
  
  // Consultar dispensaciones recientes con useSqliteQuery
  const { data: recentDispensations, isLoading: isLoadingDispensations } = useSqliteQuery({
    queryKey: ['dispensary', 'recent'],
    queryFn: async () => {
      try {
        // Obtener las 5 dispensaciones más recientes con información de miembro y producto
        return await db.getRecentDispensations(5);
      } catch (error) {
        console.error("Error fetching recent dispensations:", error);
        return [];
      }
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener conteos totales
        const membersCount = await db.getMembers().then(members => members.length);
        const usersCount = await db.getUsers().then(users => users.length);
        
        // Obtener los 5 miembros más recientes
        const members = await db.getMembers();
        const sortedMembers = [...members].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const recent = sortedMembers.slice(0, 5);

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

  if (isLoading || isLoadingCashRegister || isLoadingTransactions || isLoadingDispensations) {
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
          <span className="text-lg font-semibold">NivariaCSC Manager</span>
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
        
        {/* Recent Dispensations */}
        <Card>
          <CardHeader>
            <CardTitle>Dispensaciones recientes</CardTitle>
            <CardDescription>
              Las últimas dispensaciones realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentDispensations && recentDispensations.length > 0 ? (
              <div className="space-y-2">
                {recentDispensations.map((dispensation) => (
                  <div
                    key={dispensation.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="grid gap-1">
                      <p className="font-medium">
                        {dispensation.firstName} {dispensation.lastName}
                      </p>
                      <div className="text-sm text-muted-foreground">
                        {dispensation.productName} - {dispensation.quantity}g
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">Pago: {dispensation.paymentMethod === 'cash' ? 'Efectivo' : dispensation.paymentMethod === 'bizum' ? 'Bizum' : 'Monedero'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="font-medium text-green-600">{dispensation.price}€</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(dispensation.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                No hay dispensaciones recientes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
