
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  User, 
  Database, 
  Settings,
  Cannabis,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isSidebarOpen: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  to, 
  icon, 
  label, 
  isActive,
  isSidebarOpen
}) => {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${
        isActive 
          ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      }`}
    >
      {icon}
      {isSidebarOpen && <span>{label}</span>}
    </Link>
  );
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-20 flex h-full flex-col overflow-y-auto bg-sidebar border-r border-sidebar-border transition-all ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <Cannabis className="h-6 w-6 text-sidebar-foreground" />
              <span className="text-lg font-semibold text-sidebar-foreground">
                GreenLeaf
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-2">
          <SidebarItem
            to="/dashboard"
            icon={<Database className="h-4 w-4" />}
            label="Dashboard"
            isActive={location.pathname === '/dashboard'}
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarItem
            to="/members"
            icon={<Users className="h-4 w-4" />}
            label="Socios"
            isActive={location.pathname.startsWith('/members')}
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarItem
            to="/users"
            icon={<User className="h-4 w-4" />}
            label="Usuarios"
            isActive={location.pathname.startsWith('/users')}
            isSidebarOpen={isSidebarOpen}
          />
          <SidebarItem
            to="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Configuración"
            isActive={location.pathname === '/settings'}
            isSidebarOpen={isSidebarOpen}
          />
        </nav>

        {/* User info and logout */}
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center justify-between rounded-md bg-sidebar-accent p-2 text-sm text-sidebar-accent-foreground">
            {isSidebarOpen && (
              <div className="truncate">
                <p className="font-medium">{currentUser?.username}</p>
                <p className="text-xs opacity-80">
                  {currentUser?.isAdmin ? 'Administrador' : 'Usuario'}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main 
        className={`flex-1 transition-all ${
          isSidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <div className="container py-4 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
