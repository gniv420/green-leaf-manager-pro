
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { User } from '@/lib/db';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const savedUserId = localStorage.getItem('userId');
        if (savedUserId) {
          const user = await db.getUserById(Number(savedUserId));
          if (user) {
            setCurrentUser(user);
          } else {
            // If user not found, clear localStorage
            localStorage.removeItem('userId');
          }
        }
      } catch (error) {
        console.error('Authentication check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthentication();
  }, []);
  
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Use the fixed method that properly returns a user directly
      const user = await db.users.where('email').equals(email).first();
      
      if (user && user.password === password) {
        // Update last login time
        await db.updateUser(user.id as number, {
          lastLogin: new Date().toISOString()
        });
        
        // Update user data with last login time
        const updatedUser = { ...user, lastLogin: new Date().toISOString() };
        setCurrentUser(updatedUser);
        
        // Store user ID in localStorage
        localStorage.setItem('userId', String(user.id));
        
        return true;
      } else {
        toast({
          title: "Error de acceso",
          description: "Nombre de usuario o contraseña incorrectos",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al iniciar sesión",
        variant: "destructive",
      });
      return false;
    }
  };
  
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('userId');
    navigate('/login');
  };
  
  const value = {
    currentUser,
    login,
    logout,
    isLoading,
    isAuthenticated: !!currentUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
