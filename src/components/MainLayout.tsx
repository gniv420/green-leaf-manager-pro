import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Cannabis, 
  Users, 
  BarChart4, 
  CreditCard, 
  Settings, 
  Menu, 
  CircleDollarSign, 
  Package2,
  User,
  FileBarChart
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarItem {
  title: string;
  icon: React.FC<any>;
  path: string;
  admin?: boolean;
}

export const MainLayout = () => {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const { currentUser, logout } = useAuth();
  
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  const sidebarItems: SidebarItem[] = [
    {
      title: "Dashboard",
      icon: BarChart4,
      path: "/dashboard",
    },
    {
      title: "Socios",
      icon: Users,
      path: "/members",
    },
    {
      title: "Dispensario",
      icon: Cannabis,
      path: "/dispensary",
    },
    {
      title: "Caja",
      icon: CircleDollarSign,
      path: "/cash-register",
    },
    {
      title: "Inventario",
      icon: Package2,
      path: "/inventory",
      admin: true,
    },
    {
      title: "Informes",
      icon: FileBarChart,
      path: "/reports",
      admin: true,
    },
    {
      title: "Usuarios",
      icon: User,
      path: "/users",
      admin: true,
    },
    {
      title: "Ajustes",
      icon: Settings,
      path: "/settings",
      admin: true,
    },
  ];

  const isAdmin = currentUser?.isAdmin === true;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredSidebarItems = sidebarItems.filter(item => !item.admin || isAdmin);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile menu button */}
      {isMobile && (
        <div className="fixed top-0 left-0 z-50 p-4 bg-background">
          <Button variant="outline" size="icon" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        "bg-accent/50 h-screen border-r transition-all duration-300 ease-in-out",
        isMobile 
          ? showMobileMenu ? "fixed inset-0 z-40 w-[240px]" : "-translate-x-full fixed inset-0 z-40 w-[240px]"
          : "w-[240px]"
      )}>
        <div className="p-4 h-[60px] border-b flex items-center justify-center">
          <h1 className="text-lg font-bold">Cannabis Association</h1>
        </div>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-1 p-2">
            {filteredSidebarItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link to={item.path} key={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-start gap-2", 
                      isActive ? "bg-secondary" : ""
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="h-[60px] border-t p-2">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
