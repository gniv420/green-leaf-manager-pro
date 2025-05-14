
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  User, 
  Filter, 
  SlidersHorizontal, 
  MoreVertical, 
  UserPlus, 
  X, 
  AlertCircle
} from "lucide-react";
import MemberCard from "@/components/MemberCard";
import { useDebounce } from "@/hooks/use-debounce";

// Define Member type for TypeScript
interface Member {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipType: string;
  membershipDate: Date;
  isActive: boolean;
  preferredProductType?: string;
  consumptionMethod?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  dateOfBirth?: Date;
  idNumber?: string;
  medicalConditions?: string;
  notes?: string;
}

// Define props for MemberCard component to fix type error
interface MemberCardProps {
  member: Member;
  onEdit?: () => void;
  onView?: () => void;
}

const Members = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [membershipFilter, setMembershipFilter] = useState<string>("all");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Alert dialog state
  const [deleteMemberId, setDeleteMemberId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Load members from database
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const allMembers = await db.members.toArray();
        
        // Convert membershipDate strings to Date objects if needed
        const formattedMembers = allMembers.map(member => ({
          ...member,
          membershipDate: member.membershipDate instanceof Date 
            ? member.membershipDate 
            : new Date(member.membershipDate)
        }));
        
        setMembers(formattedMembers);
        setFilteredMembers(formattedMembers);
      } catch (error) {
        console.error("Error fetching members:", error);
        toast({
          title: "Error",
          description: "Ha ocurrido un error al cargar los socios",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMembers();
  }, []);
  
  // Filter members based on search term and filters
  useEffect(() => {
    let result = [...members];
    
    // Apply search filter
    if (debouncedSearchTerm) {
      const searchTermLower = debouncedSearchTerm.toLowerCase();
      result = result.filter((member) => 
        member.firstName.toLowerCase().includes(searchTermLower) || 
        member.lastName.toLowerCase().includes(searchTermLower) || 
        member.email.toLowerCase().includes(searchTermLower) ||
        (member.phone && member.phone.includes(searchTermLower))
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      result = result.filter((member) => member.isActive === isActive);
    }
    
    // Apply membership filter
    if (membershipFilter !== "all") {
      result = result.filter((member) => 
        member.membershipType.toLowerCase() === membershipFilter
      );
    }
    
    setFilteredMembers(result);
  }, [debouncedSearchTerm, members, statusFilter, membershipFilter]);
  
  // Handle member deletion
  const confirmDeleteMember = (id: number) => {
    setDeleteMemberId(id);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteMember = async () => {
    if (deleteMemberId) {
      try {
        // Get member info for toast message
        const member = members.find(m => m.id === deleteMemberId);
        
        // Delete member from database
        await db.members.delete(deleteMemberId);
        
        // Update state
        const updatedMembers = members.filter(m => m.id !== deleteMemberId);
        setMembers(updatedMembers);
        setFilteredMembers(
          filteredMembers.filter(m => m.id !== deleteMemberId)
        );
        
        // Show success message
        toast({
          title: "Socio eliminado",
          description: member 
            ? `${member.firstName} ${member.lastName} ha sido eliminado correctamente` 
            : "El socio ha sido eliminado correctamente",
        });
      } catch (error) {
        console.error("Error deleting member:", error);
        toast({
          title: "Error",
          description: "Ha ocurrido un error al eliminar el socio",
          variant: "destructive",
        });
      }
    }
    // Close dialog
    setIsDeleteDialogOpen(false);
    setDeleteMemberId(null);
  };
  
  // Handle navigation to member details
  const handleViewMember = (id: number) => {
    navigate(`/members/${id}`);
  };
  
  // Handle navigation to edit member
  const handleEditMember = (id: number) => {
    navigate(`/members/${id}`);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMembershipFilter("all");
    setShowFilters(false);
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Socios</h1>
          <Button onClick={() => navigate("/members/new")} className="flex items-center gap-2">
            <UserPlus size={16} />
            <span className="hidden sm:inline">Nuevo Socio</span>
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar socios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            <span>Filtros</span>
          </Button>
        </div>

        {showFilters && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} />
                  <CardTitle className="text-lg">Filtros</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowFilters(false)}
                >
                  <X size={18} />
                  <span className="sr-only">Cerrar</span>
                </Button>
              </div>
              <CardDescription>
                Filtra la lista de socios por estado y tipo de membresía
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Membresía</label>
                  <Select
                    value={membershipFilter}
                    onValueChange={setMembershipFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="standard">Estándar</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button
                variant="ghost"
                onClick={clearFilters}
              >
                Limpiar Filtros
              </Button>
              <Button 
                onClick={() => setShowFilters(false)}
              >
                Aplicar
              </Button>
            </CardFooter>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <p>Cargando socios...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User size={18} className="text-primary" />
                    {member.firstName} {member.lastName}
                  </CardTitle>
                  <CardDescription>{member.email}</CardDescription>
                </CardHeader>
                <CardContent className="py-2 flex-grow">
                  <div className="space-y-2">
                    {member.phone && (
                      <p className="text-sm">📱 {member.phone}</p>
                    )}
                    <p className="text-sm">
                      🔖 {member.membershipType.charAt(0).toUpperCase() + member.membershipType.slice(1)}
                    </p>
                    <p className="text-sm">
                      📅 Miembro desde: {member.membershipDate.toLocaleDateString()}
                    </p>
                    {!member.isActive && (
                      <div className="flex items-center gap-1 text-amber-600 text-sm font-medium mt-2">
                        <AlertCircle size={14} />
                        <span>Inactivo</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t flex justify-between">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMember(member.id as number)}
                  >
                    Ver detalles
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleEditMember(member.id as number)}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => confirmDeleteMember(member.id as number)}
                        className="text-red-600"
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <User size={64} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-medium mb-2">No se encontraron socios</h3>
            <p className="text-gray-500 mb-6">
              {debouncedSearchTerm || statusFilter !== "all" || membershipFilter !== "all"
                ? "No hay socios que coincidan con tus filtros. Intenta con otros criterios."
                : "Aún no has añadido ningún socio. Crea uno nuevo para comenzar."}
            </p>
            {debouncedSearchTerm || statusFilter !== "all" || membershipFilter !== "all" ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button onClick={() => navigate("/members/new")} className="flex items-center gap-2">
                <Plus size={16} />
                <span>Añadir socio</span>
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El socio será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Members;
