
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, Member } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Search, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      let allMembers = await db.members.toArray();
      allMembers.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setMembers(allMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los socios'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    
    try {
      // Delete all documents associated with this member first
      await db.documents.where('memberId').equals(memberToDelete).delete();
      // Then delete the member
      await db.members.delete(memberToDelete);
      
      // Update the members list
      setMembers(members.filter(member => member.id !== memberToDelete));
      
      toast({
        title: 'Socio eliminado',
        description: 'El socio ha sido eliminado correctamente'
      });
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el socio'
      });
    } finally {
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const confirmDelete = (id?: number) => {
    if (!id) return;
    setMemberToDelete(id);
    setDeleteDialogOpen(true);
  };

  const filteredMembers = members.filter(member => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchTermLower) ||
      member.lastName.toLowerCase().includes(searchTermLower) ||
      member.dni.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Socios</h1>
        <Button asChild className="bg-green-600 hover:bg-green-700">
          <Link to="/members/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Socio
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, apellido o DNI..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellidos</TableHead>
                <TableHead>Fecha de Nacimiento</TableHead>
                <TableHead>Consumo (g)</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.dni}</TableCell>
                    <TableCell>{member.firstName}</TableCell>
                    <TableCell>{member.lastName}</TableCell>
                    <TableCell>
                      {new Date(member.dob).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{member.consumptionGrams}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link to={`/members/${member.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchTerm
                      ? 'No se encontraron socios que coincidan con la búsqueda'
                      : 'No hay socios registrados'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este socio? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
