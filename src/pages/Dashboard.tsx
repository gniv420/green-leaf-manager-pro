
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, Member } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, Database, Cannabis } from 'lucide-react';

const Dashboard = () => {
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios con acceso al sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base de datos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SQLite</div>
            <p className="text-xs text-muted-foreground">
              Sistema de almacenamiento local
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
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
                        DNI: {member.dni}
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
      </div>
    </div>
  );
};

export default Dashboard;
