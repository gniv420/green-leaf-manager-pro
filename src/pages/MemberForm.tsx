
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Member } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import DocumentsSection from '@/components/DocumentsSection';

const MemberForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = id !== 'new';
  
  const [formData, setFormData] = useState<Omit<Member, 'id' | 'createdAt' | 'updatedAt'>>({
    firstName: '',
    lastName: '',
    dob: new Date(),
    dni: '',
    consumptionGrams: 0,
    sponsorId: null,
  });

  const [sponsors, setSponsors] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all potential sponsors
        const allSponsors = await db.members.toArray();
        setSponsors(allSponsors);
        
        // If editing, fetch the member data
        if (isEditing && id) {
          const memberId = parseInt(id);
          const member = await db.members.get(memberId);
          if (member) {
            setFormData({
              firstName: member.firstName,
              lastName: member.lastName,
              dob: new Date(member.dob),
              dni: member.dni,
              consumptionGrams: member.consumptionGrams,
              sponsorId: member.sponsorId,
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'No se encontró el socio'
            });
            navigate('/members');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al cargar los datos'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, isEditing, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      dob: new Date(e.target.value),
    }));
  };

  const handleSponsorChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      sponsorId: value === "null" ? null : parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEditing && id) {
        // Update existing member
        const memberId = parseInt(id);
        await db.members.update(memberId, {
          ...formData,
          updatedAt: new Date(),
        });
        toast({
          title: 'Socio actualizado',
          description: 'Los datos del socio se han actualizado correctamente'
        });
      } else {
        // Create new member
        await db.members.add({
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        toast({
          title: 'Socio creado',
          description: 'El socio ha sido registrado correctamente'
        });
      }
      navigate('/members');
    } catch (error) {
      console.error('Error saving member:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar el socio'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? 'Editar Socio' : 'Nuevo Socio'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>
              Información básica del socio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellidos</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI/NIE</Label>
                <Input
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Fecha de Nacimiento</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob.toISOString().split('T')[0]}
                  onChange={handleDateChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumptionGrams">Previsión de Consumo (g/mes)</Label>
                <Input
                  id="consumptionGrams"
                  name="consumptionGrams"
                  type="number"
                  min="0"
                  value={formData.consumptionGrams}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsorId">Socio Avalista</Label>
                <Select
                  value={formData.sponsorId?.toString() || "null"}
                  onValueChange={handleSponsorChange}
                >
                  <SelectTrigger id="sponsorId" className="border-green-200 focus-visible:ring-green-500">
                    <SelectValue placeholder="Seleccionar avalista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Sin avalista</SelectItem>
                    {sponsors
                      .filter(sponsor => !isEditing || sponsor.id !== parseInt(id!))
                      .map(sponsor => (
                        <SelectItem key={sponsor.id} value={sponsor.id!.toString()}>
                          {sponsor.firstName} {sponsor.lastName} ({sponsor.dni})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/members')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                  Guardando...
                </div>
              ) : (
                'Guardar'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {isEditing && id && (
        <div className="mt-6">
          <DocumentsSection memberId={parseInt(id)} />
        </div>
      )}
    </div>
  );
};

export default MemberForm;
