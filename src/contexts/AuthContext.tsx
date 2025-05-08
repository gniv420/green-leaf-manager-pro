
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, User } from '@/lib/db';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkLoggedInUser = async () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Verify user still exists in database
          const dbUser = await db.users.get(parsedUser.id);
          if (dbUser) {
            setCurrentUser(dbUser);
          } else {
            // User was deleted, clear local storage
            localStorage.removeItem('currentUser');
          }
        }
      } catch (error) {
        console.error('Error checking logged in user:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };

    checkLoggedInUser();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log("Intento de login con:", username, password); // Para depuración
      const user = await db.users.where('username').equals(username).first();
      console.log("Usuario encontrado:", user); // Para depuración
      
      if (user && user.password === password) {
        setCurrentUser(user);
        // Store user in localStorage for persistence
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Actualizar lastLogin
        await db.users.update(user.id!, {
          lastLogin: new Date()
        });
        
        toast({
          title: "¡Inicio de sesión exitoso!",
          description: `Bienvenido, ${user.fullName}`,
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "Usuario o contraseña incorrectos",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: "Ocurrió un error al iniciar sesión",
      });
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    navigate('/login');
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  };

  const value = {
    currentUser,
    isLoading,
    login,
    logout,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
