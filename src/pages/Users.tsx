
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { User } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Users() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Cargar usuarios
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await db.users.toArray();
        setUsers(userList);
      } catch (error) {
        console.error('Error loading users:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los usuarios',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, []);
  
  // Abrir diálogo para nuevo usuario
  const handleNewUser = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setIsAdmin(false);
    setDialogOpen(true);
  };
  
  // Abrir diálogo para editar usuario
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword('');  // No mostramos la contraseña actual
    setFullName(user.fullName);
    setIsAdmin(user.isAdmin);
    setDialogOpen(true);
  };
  
  // Guardar usuario (nuevo o edición)
  const handleSaveUser = async () => {
    try {
      if (!username || (!password && !editingUser) || !fullName) {
        toast({
          title: 'Error',
          description: 'Todos los campos son obligatorios',
          variant: 'destructive',
        });
        return;
      }
      
      // Verificar si el nombre de usuario ya existe
      if (!editingUser) {
        const existingUser = await db.users.where('username').equals(username).first();
        if (existingUser) {
          toast({
            title: 'Error',
            description: 'El nombre de usuario ya existe',
            variant: 'destructive',
          });
          return;
        }
      }
      
      if (editingUser) {
        // Actualizar usuario existente
        const updatedUser: Partial<User> = {
          fullName,
          isAdmin,
        };
        
        if (password) {
          updatedUser.password = password;
        }
        
        await db.users.update(editingUser.id as number, updatedUser);
        
        // Actualizar lista de usuarios
        setUsers(users.map(user => 
          user.id === editingUser.id ? { ...user, ...updatedUser } : user
        ));
        
        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente',
        });
      } else {
        // Crear nuevo usuario
        const newUser: Omit<User, 'id'> = {
          username,
          password,
          fullName,
          isAdmin,
          createdAt: new Date().toISOString(),
        };
        
        const id = await db.users.add(newUser);
        
        // Actualizar lista de usuarios
        setUsers([...users, { ...newUser, id }]);
        
        toast({
          title: 'Éxito',
          description: 'Usuario creado correctamente',
        });
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar el usuario',
        variant: 'destructive',
      });
    }
  };
  
  // Eliminar usuario
  const handleDeleteUser = async (userId: number) => {
    try {
      // No permitir eliminar el propio usuario
      if (currentUser?.id === userId) {
        toast({
          title: 'Error',
          description: 'No puedes eliminar tu propio usuario',
          variant: 'destructive',
        });
        return;
      }
      
      await db.users.delete(userId);
      
      // Actualizar lista de usuarios
      setUsers(users.filter(user => user.id !== userId));
      
      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el usuario',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <Button onClick={handleNewUser}>Nuevo Usuario</Button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">Cargando usuarios...</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                      {user.isAdmin ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                      Editar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={currentUser?.id === user.id}>
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El usuario será eliminado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => user.id && handleDeleteUser(user.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Diálogo para crear/editar usuario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="username" className="text-sm font-medium">Nombre de Usuario</label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editingUser}  // Deshabilitar edición de username si estamos editando
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña {editingUser && "(dejar en blanco para mantener la actual)"}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium">Nombre Completo</label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isAdmin" 
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked === true)}
              />
              <label
                htmlFor="isAdmin"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Es administrador
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
