
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Member } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MemberCard from '@/components/MemberCard';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search } from 'lucide-react';

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rfidCode, setRfidCode] = useState('');
  const [rfidSearchMode, setRfidSearchMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);
  
  // Cargar miembros
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const memberList = await db.members.toArray();
        setMembers(memberList);
        setFilteredMembers(memberList);
      } catch (error) {
        console.error('Error loading members:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los miembros',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadMembers();
  }, []);
  
  // Filtrar miembros basado en la búsqueda
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = members.filter(member => 
        member.firstName.toLowerCase().includes(query) || 
        member.lastName.toLowerCase().includes(query) || 
        member.dni.toLowerCase().includes(query) || 
        member.memberCode.toLowerCase().includes(query)
      );
      setFilteredMembers(filtered);
    }
  }, [searchQuery, members]);
  
  // Escuchar eventos de teclado para el lector RFID
  useEffect(() => {
    let rfidBuffer = '';
    let rfidTimeout: NodeJS.Timeout;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo procesar en modo búsqueda RFID o si es un input específico para RFID
      if (!rfidSearchMode) return;
      
      // Evitar procesar teclas si el foco está en un input
      if (document.activeElement instanceof HTMLInputElement || 
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Resetear el timeout cada vez que se pulsa una tecla
      clearTimeout(rfidTimeout);
      
      // Si es un número o una tecla que podría ser parte del código RFID
      if (/[\d\w]/.test(e.key) && e.key.length === 1) {
        rfidBuffer += e.key;
        e.preventDefault(); // Prevenir comportamiento por defecto
      }
      
      // Enter podría indicar el final de la lectura
      if (e.key === 'Enter' && rfidBuffer.length > 0) {
        handleRfidSearch(rfidBuffer);
        rfidBuffer = '';
        e.preventDefault(); // Prevenir comportamiento por defecto
      }
      
      // Establecer timeout para limpiar el buffer si no hay más input
      rfidTimeout = setTimeout(() => {
        if (rfidBuffer.length > 5) {
          handleRfidSearch(rfidBuffer);
        }
        rfidBuffer = '';
      }, 500); // 500ms timeout
    };
    
    // Añadir event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(rfidTimeout);
    };
  }, [rfidSearchMode]);
  
  // Manejar búsqueda por RFID
  const handleRfidSearch = async (code: string) => {
    try {
      if (!code) return;
      
      const member = await db.members.where('rfidCode').equals(code).first();
      
      if (member) {
        // Navegar a detalles del miembro si se encuentra
        toast({
          title: 'Miembro encontrado',
          description: `${member.firstName} ${member.lastName}`,
        });
        navigate(`/members/${member.id}`);
      } else {
        toast({
          title: 'Miembro no encontrado',
          description: 'No se encontró ningún miembro con ese código RFID',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching by RFID:', error);
      toast({
        title: 'Error',
        description: 'Error al buscar por RFID',
        variant: 'destructive',
      });
    } finally {
      setRfidCode('');
    }
  };
  
  // Confirmar y eliminar miembro
  const handleDeleteMember = async () => {
    if (memberToDelete === null) return;
    
    try {
      await db.deleteMember(memberToDelete);
      
      // Actualizar listado
      setMembers(members.filter(member => member.id !== memberToDelete));
      setFilteredMembers(filteredMembers.filter(member => member.id !== memberToDelete));
      
      toast({
        title: 'Éxito',
        description: 'Miembro eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el miembro',
        variant: 'destructive',
      });
    } finally {
      setMemberToDelete(null);
      setDeleteDialogOpen(false);
    }
  };
  
  // Preparar eliminación de miembro
  const confirmDeleteMember = (memberId: number) => {
    setMemberToDelete(memberId);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Miembros</h1>
        <div className="space-x-2">
          <Button 
            variant={rfidSearchMode ? "default" : "outline"} 
            onClick={() => setRfidSearchMode(!rfidSearchMode)}
          >
            {rfidSearchMode ? "Modo RFID Activo" : "Modo RFID"}
          </Button>
          <Link to="/members/new">
            <Button>Nuevo Miembro</Button>
          </Link>
        </div>
      </div>
      
      {/* Barra de búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Buscar miembros por nombre, DNI o código..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {/* Información de modo RFID */}
      {rfidSearchMode && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
          <p className="flex items-center">
            <span className="mr-2">•</span>
            <span>Modo RFID activado. Escanee una tarjeta para buscar el miembro.</span>
          </p>
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">Cargando miembros...</div>
      ) : (
        <>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No se encontraron miembros con esa búsqueda' : 'No hay miembros registrados'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMembers.map(member => (
                <MemberCard 
                  key={member.id} 
                  member={member} 
                  onDelete={() => member.id && confirmDeleteMember(member.id)} 
                />
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El miembro será eliminado permanentemente 
              junto con todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
