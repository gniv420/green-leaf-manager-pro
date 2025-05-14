
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { FormGroup } from '@/components/ui/form';
import { Member } from '@/lib/db';

// Definir el tipo para los parámetros de ruta
interface RouteParams {
  id?: string;
}

export default function MemberForm() {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado inicial con todos los campos obligatorios
  const [member, setMember] = useState<Member>({
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    city: '', // Aseguramos que esté este campo
    postalCode: '', // Aseguramos que esté este campo
    joinDate: format(new Date(), 'yyyy-MM-dd'), // Formato string para SQLite
    consumptionGrams: 0,
    notes: '',
    status: 'active' as const, // Aseguramos que esté este campo con el tipo correcto
    memberCode: '',
    balance: 0,
    rfidCode: '',
    createdAt: format(new Date(), 'yyyy-MM-dd'), // Formato string para SQLite
    updatedAt: format(new Date(), 'yyyy-MM-dd'), // Formato string para SQLite
  });

  // Cargar datos del miembro si estamos editando
  useEffect(() => {
    if (id) {
      setIsEditing(true);
      setIsLoading(true);
      
      const fetchMember = async () => {
        try {
          const memberData = await db.getMemberById(Number(id));
          
          if (memberData) {
            // Actualizamos todos los campos necesarios
            setMember({
              ...memberData,
              // Aseguramos que todos los campos estén presentes
              firstName: memberData.firstName || '',
              lastName: memberData.lastName || '',
              dni: memberData.dni || '',
              email: memberData.email || '',
              phone: memberData.phone || '',
              dob: memberData.dob || '',
              address: memberData.address || '',
              city: memberData.city || '',
              postalCode: memberData.postalCode || '',
              joinDate: memberData.joinDate || format(new Date(), 'yyyy-MM-dd'),
              consumptionGrams: memberData.consumptionGrams || 0,
              notes: memberData.notes || '',
              status: memberData.status || 'active',
              memberCode: memberData.memberCode || '',
              balance: memberData.balance || 0,
              rfidCode: memberData.rfidCode || '',
              createdAt: memberData.createdAt || format(new Date(), 'yyyy-MM-dd'),
              updatedAt: format(new Date(), 'yyyy-MM-dd'),
            });
          }
        } catch (error) {
          console.error('Error loading member:', error);
          toast({
            title: 'Error',
            description: 'No se pudo cargar los datos del miembro',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchMember();
    }
  }, [id]);

  // Verificar si el DNI ya existe para nuevos miembros
  const checkDniExists = async (dni: string) => {
    if (!isEditing) {
      const members = await db.members.toArray();
      return members.some(m => m.dni === dni);
    }
    return false;
  };

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMember(prev => ({ ...prev, [name]: value }));
  };

  // Manejar submit del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validaciones básicas
      if (!member.firstName || !member.lastName || !member.dni) {
        toast({
          title: 'Error',
          description: 'Todos los campos marcados con * son obligatorios',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // Verificar DNI duplicado
      if (await checkDniExists(member.dni)) {
        toast({
          title: 'Error',
          description: 'El DNI ya existe en la base de datos',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      if (isEditing && id) {
        // Actualizar miembro existente
        await db.updateMember(Number(id), {
          ...member,
          updatedAt: format(new Date(), 'yyyy-MM-dd'),
        });
        
        toast({
          title: 'Éxito',
          description: 'Miembro actualizado correctamente',
        });
      } else {
        // Crear nuevo miembro
        // Generar código de miembro automáticamente
        const memberCode = await db.generateMemberCode(member.firstName, member.lastName);
        
        const newMember = {
          ...member,
          memberCode,
          joinDate: format(new Date(), 'yyyy-MM-dd'),
          createdAt: format(new Date(), 'yyyy-MM-dd'),
          updatedAt: format(new Date(), 'yyyy-MM-dd'),
        };
        
        await db.addMember(newMember);
        
        toast({
          title: 'Éxito',
          description: 'Miembro creado correctamente',
        });
      }
      
      navigate('/members');
    } catch (error) {
      console.error('Error saving member:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar los datos del miembro',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? 'Editar Miembro' : 'Nuevo Miembro'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup>
            <label htmlFor="firstName" className="block text-sm font-medium">Nombre *</label>
            <Input 
              id="firstName"
              name="firstName" 
              value={member.firstName} 
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="lastName" className="block text-sm font-medium">Apellidos *</label>
            <Input 
              id="lastName"
              name="lastName" 
              value={member.lastName} 
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="dni" className="block text-sm font-medium">DNI *</label>
            <Input 
              id="dni"
              name="dni" 
              value={member.dni} 
              onChange={handleChange}
              disabled={isLoading || isEditing}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <Input 
              id="email"
              name="email" 
              type="email"
              value={member.email} 
              onChange={handleChange}
              disabled={isLoading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="phone" className="block text-sm font-medium">Teléfono</label>
            <Input 
              id="phone"
              name="phone" 
              value={member.phone} 
              onChange={handleChange}
              disabled={isLoading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="dob" className="block text-sm font-medium">Fecha de nacimiento</label>
            <Input 
              id="dob"
              name="dob" 
              type="date"
              value={member.dob} 
              onChange={handleChange}
              disabled={isLoading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="address" className="block text-sm font-medium">Dirección</label>
            <Input 
              id="address"
              name="address" 
              value={member.address} 
              onChange={handleChange}
              disabled={isLoading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="city" className="block text-sm font-medium">Ciudad</label>
            <Input 
              id="city"
              name="city" 
              value={member.city} 
              onChange={handleChange}
              disabled={isLoading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="postalCode" className="block text-sm font-medium">Código Postal</label>
            <Input 
              id="postalCode"
              name="postalCode" 
              value={member.postalCode} 
              onChange={handleChange}
              disabled={isLoading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="consumptionGrams" className="block text-sm font-medium">Consumo (gramos)</label>
            <Input 
              id="consumptionGrams"
              name="consumptionGrams" 
              type="number"
              value={member.consumptionGrams.toString()} 
              onChange={e => setMember({...member, consumptionGrams: parseFloat(e.target.value) || 0})}
              disabled={isLoading}
            />
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="status" className="block text-sm font-medium">Estado</label>
            <select 
              id="status"
              name="status"
              className="w-full p-2 border rounded"
              value={member.status}
              onChange={e => setMember({...member, status: e.target.value as 'active' | 'inactive' | 'pending'})}
              disabled={isLoading}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="pending">Pendiente</option>
            </select>
          </FormGroup>
          
          <FormGroup>
            <label htmlFor="rfidCode" className="block text-sm font-medium">Código RFID</label>
            <Input 
              id="rfidCode"
              name="rfidCode" 
              value={member.rfidCode || ''} 
              onChange={handleChange}
              disabled={isLoading}
            />
          </FormGroup>
        </div>
        
        <FormGroup>
          <label htmlFor="notes" className="block text-sm font-medium">Notas</label>
          <Textarea 
            id="notes"
            name="notes" 
            value={member.notes || ''} 
            onChange={handleChange}
            disabled={isLoading}
            className="min-h-[100px]"
          />
        </FormGroup>
        
        <div className="flex space-x-4">
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
          </Button>
          
          <Button 
            type="button" 
            variant="outline"
            disabled={isLoading}
            onClick={() => navigate('/members')}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
