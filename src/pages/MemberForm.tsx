
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductType } from "@/lib/product-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Define the form schema with Zod
const formSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(9, "El número debe tener al menos 9 dígitos"),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  idNumber: z.string().optional(),
  membershipType: z.enum(["standard", "premium"]),
  membershipDate: z.string(),
  preferredProductType: z.enum(["sativa", "indica", "hibrido", "other"] as const),
  consumptionMethod: z.enum(["fumar", "vapear", "comestibles", "tintura", "otro"]),
  medicalConditions: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const MemberForm = () => {
  const navigate = useNavigate();
  // Fix the parameter typing by defining a specific type for the params
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!!id);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      city: "",
      postalCode: "",
      idNumber: "",
      membershipType: "standard",
      membershipDate: new Date().toISOString().substring(0, 10),
      preferredProductType: "sativa",
      consumptionMethod: "fumar",
      medicalConditions: "",
      notes: "",
      isActive: true,
    },
  });

  // Fetch member data if editing
  useEffect(() => {
    const fetchMember = async () => {
      if (id) {
        try {
          setLoading(true);
          const memberId = parseInt(id);
          const member = await db.members.get(memberId);
          
          if (member) {
            // Format date for input
            const formattedDate = member.membershipDate instanceof Date 
              ? member.membershipDate.toISOString().substring(0, 10)
              : new Date(member.membershipDate).toISOString().substring(0, 10);
            
            const dateOfBirth = member.dateOfBirth instanceof Date 
              ? member.dateOfBirth.toISOString().substring(0, 10)
              : member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().substring(0, 10) : '';
            
            // Set form values
            form.reset({
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              phone: member.phone || "",
              dateOfBirth: dateOfBirth,
              address: member.address || "",
              city: member.city || "",
              postalCode: member.postalCode || "",
              idNumber: member.idNumber || "",
              membershipType: member.membershipType as "standard" | "premium",
              membershipDate: formattedDate,
              preferredProductType: member.preferredProductType as ProductType,
              consumptionMethod: member.consumptionMethod || "fumar",
              medicalConditions: member.medicalConditions || "",
              notes: member.notes || "",
              isActive: member.isActive !== false,
            });
          } else {
            toast({
              title: "Error",
              description: `No se encontró el socio con ID ${id}`,
              variant: "destructive",
            });
            navigate("/members");
          }
        } catch (error) {
          console.error("Error fetching member:", error);
          toast({
            title: "Error",
            description: "Ha ocurrido un error al cargar los datos del socio",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMember();
  }, [id, navigate, form]);

  // Form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      
      // Convert string dates to Date objects
      const formattedData = {
        ...data,
        membershipDate: new Date(data.membershipDate),
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      };

      if (isEditing && id) {
        // Update existing member
        const memberId = parseInt(id);
        await db.members.update(memberId, formattedData);
        toast({
          title: "Socio actualizado",
          description: `${data.firstName} ${data.lastName} ha sido actualizado correctamente`,
        });
      } else {
        // Create new member
        const newId = await db.members.add(formattedData);
        toast({
          title: "Socio añadido",
          description: `${data.firstName} ${data.lastName} ha sido añadido con ID ${newId}`,
        });
      }
      
      navigate("/members");
    } catch (error) {
      console.error("Error saving member:", error);
      toast({
        title: "Error",
        description: "Ha ocurrido un error al guardar los datos del socio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? "Editar Socio" : "Añadir Nuevo Socio"}
      </h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apellidos" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email*</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@ejemplo.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="666 123 456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI/NIE</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345678X" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dirección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Calle, número, piso..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ciudad" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información de Membresía</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="membershipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Membresía*</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="standard" id="standard" />
                            <Label htmlFor="standard">Estándar</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="premium" id="premium" />
                            <Label htmlFor="premium">Premium</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="membershipDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Membresía*</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Miembro Activo</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="preferredProductType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de producto preferido</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo de producto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sativa">Sativa</SelectItem>
                        <SelectItem value="indica">Indica</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="consumptionMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de consumo preferido</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método de consumo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fumar">Fumar</SelectItem>
                        <SelectItem value="vapear">Vapear</SelectItem>
                        <SelectItem value="comestibles">Comestibles</SelectItem>
                        <SelectItem value="tintura">Tintura</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información Médica y Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="medicalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condiciones Médicas</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Condiciones médicas relevantes..."
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Notas adicionales..."
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate("/members")}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? "Guardando..." : isEditing ? "Actualizar Socio" : "Crear Socio"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MemberForm;
