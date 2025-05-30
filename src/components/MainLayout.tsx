
import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { 
  Cannabis, 
  Users, 
  BarChart4, 
  Settings, 
  Menu, 
  CircleDollarSign, 
  Package2,
  User,
  FileBarChart,
  LogOut
} from "lucide-react";

interface SidebarItem {
  title: string;
  icon: React.FC<any>;
  path: string;
  admin?: boolean;
}

export const MainLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { associationName, logoPreview } = useSettings();
  const { toggleSidebar, state } = useSidebar();
  
  console.log("MainLayout rendering, current path:", pathname);
  
  useEffect(() => {
    console.log("MainLayout mounted/updated with path:", pathname);
    
    // Parse the path to check if we're on a member details page
    if (pathname.startsWith('/members/')) {
      const memberId = pathname.split('/').pop();
      console.log("On member details page for ID:", memberId);
    }
    
    return () => {
      console.log("MainLayout unmounting from path:", pathname);
    };
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
  const filteredSidebarItems = sidebarItems.filter(item => !item.admin || isAdmin);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  const handleNavigation = (path: string) => {
    console.log(`Navigation: Navigating to ${path}`);
    navigate(path);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="flex items-center justify-center border-b">
          <div className="flex items-center justify-center gap-2 p-2">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-8 w-8 object-contain" />
            ) : (
              <Cannabis className="h-6 w-6 text-green-600" />
            )}
            <span className="text-lg font-semibold truncate sidebar-name">{associationName}</span>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <SidebarMenu>
              {filteredSidebarItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link to={item.path} onClick={() => console.log(`Clicked on: ${item.path}`)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        
        <SidebarFooter className="border-t">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 hover:bg-primary hover:text-primary-foreground bg-sidebar-accent text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium sidebar-logout-text">Cerrar sesión</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="p-2 border-b flex items-center">
          <SidebarTrigger className="mr-2 p-1 bg-sidebar-accent hover:bg-sidebar-accent/80 rounded-md flex items-center justify-center">
            <Menu className="h-4 w-4" />
          </SidebarTrigger>
          <h2 className="text-lg font-medium">{associationName}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
