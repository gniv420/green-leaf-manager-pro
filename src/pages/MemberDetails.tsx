import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Member, Document as DocumentType } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Pencil,
  Trash,
  File,
  Eye,
  Plus,
  AlertCircle,
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatDecimal } from '@/lib/utils';
import MemberDispensaryHistory from '@/components/MemberDispensaryHistory';
import { Document } from '.';
import { ImageIcon } from '@radix-ui/react-icons';
import { uploadFile } from '@/lib/firebase';

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  lastName: z.string().min(2, {
    message: "El apellido debe tener al menos 2 caracteres.",
  }),
  dni: z.string().min(9, {
    message: "El DNI debe tener al menos 9 caracteres.",
  }),
  email: z.string().email({
    message: "Introduce un email válido.",
  }),
  phone: z.string().min(9, {
    message: "El teléfono debe tener al menos 9 caracteres.",
  }),
  dob: z.date(),
  address: z.string().min(2, {
    message: "La dirección debe tener al menos 2 caracteres.",
  }),
  city: z.string().min(2, {
    message: "La ciudad debe tener al menos 2 caracteres.",
  }),
  postalCode: z.string().min(5, {
    message: "El código postal debe tener al menos 5 caracteres.",
  }),
  joinDate: z.date(),
  consumptionGrams: z.number(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  rfidCode: z.string().optional(),
})

// Define a component here for the form functionality
const BalanceAdjustmentDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, notes: string, paymentMethod: 'cash' | 'bizum') => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [amount, setAmount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bizum'>('cash');

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor, introduce una cantidad válida');
      return;
    }
    onConfirm(numAmount, notes, paymentMethod);
    // Reset form
    setAmount('0');
    setNotes('');
    setPaymentMethod('cash');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir saldo al monedero</DialogTitle>
          <DialogDescription>
            Introduce la cantidad que deseas añadir al monedero del socio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Cantidad (€)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentMethod" className="text-right">
              Método de pago
            </Label>
            <Select value={paymentMethod} onValueChange={(value: 'cash' | 'bizum') => setPaymentMethod(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="bizum">Bizum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notas
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MemberDetails = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDocumentViewOpen, setIsDocumentViewOpen] = useState(false);
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  // Añadir estado para el diálogo de ajuste de saldo
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();

  const member = useLiveQuery(async () => {
    if (!memberId) return undefined;
    return await db.members.get(parseInt(memberId));
  });

  const dispensaryHistory = useLiveQuery(async () => {
    if (!memberId) return [];
    return await db.dispensary
      .where('memberId')
      .equals(parseInt(memberId))
      .reverse()
      .sortBy('createdAt');
  });

  const documentTypes = useLiveQuery(() => db.documents.toArray());

  const documents = useLiveQuery(async () => {
    if (!memberId) return [];
    return await db.documents
      .where('memberId')
      .equals(parseInt(memberId))
      .toArray();
  });

  // Obtenemos el registro de caja abierta para validar
  const currentCashRegister = useLiveQuery(() => {
    return db.cashRegisters
      .where('status')
      .equals('open')
      .first();
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dni: '',
      email: '',
      phone: '',
      dob: new Date(),
      address: '',
      city: '',
      postalCode: '',
      joinDate: new Date(),
      consumptionGrams: 0,
      notes: '',
      status: 'active',
      rfidCode: '',
    },
    mode: "onChange",
  })

  useEffect(() => {
    if (member) {
      form.reset({
        firstName: member.firstName,
        lastName: member.lastName,
        dni: member.dni,
        email: member.email,
        phone: member.phone,
        dob: member.dob,
        address: member.address,
        city: member.city,
        postalCode: member.postalCode,
        joinDate: member.joinDate,
        consumptionGrams: member.consumptionGrams,
        notes: member.notes || '',
        status: member.status,
        rfidCode: member.rfidCode || '',
      });
    }
  }, [member, form]);

  const handleConfirmDeleteDocument = (documentId?: number) => {
    if (!documentId) return;
    setDocumentToDelete(documentId);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!memberId) return;

    try {
      await db.members.update(parseInt(memberId), {
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        joinDate: data.joinDate,
        consumptionGrams: data.consumptionGrams,
        notes: data.notes,
        status: data.status,
        rfidCode: data.rfidCode,
        updatedAt: new Date(),
      });

      toast({
        title: "Socio actualizado.",
        description: "Los datos del socio han sido actualizados correctamente.",
      })
      setIsEditMode(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error.",
        description: "No se pudieron actualizar los datos del socio.",
      })
    }
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberId) return;

    try {
      await db.members.delete(parseInt(memberId));
      toast({
        title: "Socio eliminado.",
        description: "El socio ha sido eliminado correctamente.",
      })
      navigate('/members');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error.",
        description: "No se pudo eliminar el socio.",
      })
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleFileUpload = async (file: File | null, documentType: string) => {
    if (!memberId || !file) return;

    try {
      // Subir el archivo a Firebase Storage
      const url = await uploadFile(file);

      // Guardar la referencia en la base de datos
      await db.documents.add({
        memberId: parseInt(memberId),
        type: documentType,
        uploadDate: new Date(),
        url: url,
        name: file.name,
      });

      toast({
        title: "Documento subido.",
        description: "El documento ha sido subido correctamente.",
      })
    } catch (error) {
      console.error("Error al subir el documento:", error);
      toast({
        variant: "destructive",
        title: "Error.",
        description: "No se pudo subir el documento.",
      })
    } finally {
      setIsUploadDialogOpen(false);
    }
  };

  // Función para manejar el ajuste de saldo del monedero
  const handleBalanceAdjustment = async (amount: number, notes: string, paymentMethod: 'cash' | 'bizum') => {
    if (!memberId || !currentCashRegister) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se puede ajustar el saldo. Verifica que haya una caja abierta."
      });
      return;
    }

    try {
      // Obtener el socio actual
      const memberToUpdate = await db.members.get(parseInt(memberId));
      if (!memberToUpdate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se encontró el socio"
        });
        return;
      }

      // Calcular el nuevo saldo
      const currentBalance = memberToUpdate.balance || 0;
      const newBalance = currentBalance + amount;

      // Actualizar el saldo del socio
      await db.members.update(parseInt(memberId), {
        balance: newBalance,
        updatedAt: new Date()
      });

      // Registrar la transacción del socio
      await db.memberTransactions.add({
        memberId: parseInt(memberId),
        amount: amount, // Positivo porque es una entrada
        type: 'deposit',
        notes: notes || 'Ajuste de saldo',
        userId: 1, // Admin por defecto
        createdAt: new Date()
      });

      // Registrar el ingreso en la caja
      await db.cashTransactions.add({
        type: 'income',
        amount: amount,
        concept: `Recarga de monedero`,
        notes: `Socio ID: ${memberId} - ${notes || 'Ajuste de saldo'}`,
        userId: 1, // Admin por defecto
        paymentMethod: paymentMethod,
        cashRegisterId: currentCashRegister.id,
        createdAt: new Date()
      });

      toast({
        title: "Saldo actualizado",
        description: `Se han añadido ${amount}€ al monedero del socio`
      });
    } catch (error) {
      console.error("Error al ajustar saldo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el saldo del monedero"
      });
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      await db.documents.delete(documentToDelete);
      toast({
        title: "Documento eliminado.",
        description: "El documento ha sido eliminado correctamente.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error.",
        description: "No se pudo eliminar el documento.",
      })
    } finally {
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  if (!member) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Detalles del Socio</h1>
        </div>
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">Cargando información del socio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Detalles del Socio</h1>
        <Button variant="secondary" onClick={() => navigate('/members')}>
          Volver
        </Button>
      </div>

      {isEditMode && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Socio</CardTitle>
            <CardDescription>
              Modifica los datos del socio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nombre del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellido" {...field} />
                      </FormControl>
                      <FormDescription>
                        Apellido del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl>
                        <Input placeholder="DNI" {...field} />
                      </FormControl>
                      <FormDescription>
                        DNI del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} />
                      </FormControl>
                      <FormDescription>
                        Email del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Teléfono" {...field} />
                      </FormControl>
                      <FormDescription>
                        Teléfono del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de nacimiento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={format(new Date(field.value), 'yyyy-MM-dd')}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Fecha de nacimiento del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Dirección" {...field} />
                      </FormControl>
                      <FormDescription>
                        Dirección del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ciudad" {...field} />
                      </FormControl>
                      <FormDescription>
                        Ciudad del socio.
                      </FormDescription>
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
                        <Input placeholder="Código Postal" {...field} />
                      </FormControl>
                      <FormDescription>
                        Código Postal del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de alta</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={format(new Date(field.value), 'yyyy-MM-dd')}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Fecha de alta del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="consumptionGrams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumo estimado (gramos/mes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Consumo estimado"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Consumo estimado del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Notas adicionales sobre el socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Estado del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rfidCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código RFID</FormLabel>
                      <FormControl>
                        <Input placeholder="Código RFID" {...field} />
                      </FormControl>
                      <FormDescription>
                        Código RFID del socio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit">
                    Actualizar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {!isEditMode && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{member.firstName} {member.lastName}</CardTitle>
                  <CardDescription>
                    Código de socio: {member.memberCode} • DNI: {member.dni}
                  </CardDescription>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsEditMode(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{member.email || "No especificado"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Teléfono</h3>
                  <p>{member.phone || "No especificado"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Fecha de nacimiento</h3>
                  <p>{member.dob ? format(new Date(member.dob), 'dd/MM/yyyy') : "No especificada"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Fecha de alta</h3>
                  <p>{member.joinDate ? format(new Date(member.joinDate), 'dd/MM/yyyy') : "No especificada"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Consumo estimado</h3>
                  <p>{member.consumptionGrams ? `${member.consumptionGrams}g / mes` : "No especificado"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                  <Badge variant={
                    member.status === 'active' ? 'default' : 
                    member.status === 'inactive' ? 'destructive' : 
                    'outline'
                  }>
                    {member.status === 'active' ? 'Activo' : 
                     member.status === 'inactive' ? 'Inactivo' : 
                     'Pendiente'}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Dirección</h3>
                  <p>{member.address || "No especificada"}</p>
                  <p>{member.postalCode} {member.city}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Código RFID</h3>
                  <p>{member.rfidCode || "No especificado"}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Notas</h3>
                  <p className="whitespace-pre-line">{member.notes || "Sin notas adicionales"}</p>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Saldo del monedero</h3>
                      <p className={`text-lg font-semibold ${
                        (member.balance || 0) < 0 
                          ? 'text-destructive' 
                          : (member.balance || 0) > 0 
                            ? 'text-green-600' 
                            : ''
                      }`}>
                        {formatDecimal(member.balance || 0)} €
                      </p>
                    </div>
                    <Button 
                      onClick={() => setIsBalanceDialogOpen(true)}
                      disabled={!currentCashRegister}
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir saldo
                    </Button>
                  </div>
                  {!currentCashRegister && (
                    <p className="text-xs text-amber-600 mt-2">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Debes abrir una caja para ajustar el saldo
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Documentos</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Subir documento
                </Button>
              </div>
              <CardDescription>
                Documentos asociados al socio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents && documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <File className="mr-2 h-4 w-4" />
                          {doc.name}
                        </CardTitle>
                        <CardDescription>
                          {doc.type} • {format(new Date(doc.uploadDate), 'dd/MM/yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between">
                          <Button variant="secondary" size="sm" onClick={() => {
                            setCurrentDocumentUrl(doc.url || null);
                            setIsDocumentViewOpen(true);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleConfirmDeleteDocument(doc.id)}>
                            <Trash className="mr-2 h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <ImageIcon className="h-6 w-6 mr-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay documentos asociados a este socio.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Historial de Dispensaciones</CardTitle>
              <CardDescription>
                Registro histórico de dispensaciones del socio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberDispensaryHistory memberId={parseInt(memberId)} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance adjustment dialog */}
      <BalanceAdjustmentDialog 
        isOpen={isBalanceDialogOpen}
        onClose={() => setIsBalanceDialogOpen(false)}
        onConfirm={handleBalanceAdjustment}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar este socio?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de documento y el archivo que deseas subir.
            </DialogDescription>
          </DialogHeader>
          <UploadForm handleFileUpload={handleFileUpload} documentTypes={documentTypes} onClose={() => setIsUploadDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDocumentViewOpen} onOpenChange={() => setIsDocumentViewOpen(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Visualización de Documento</DialogTitle>
          </DialogHeader>
          <div className="aspect-w-16 aspect-h-9">
            {currentDocumentUrl && (
              <iframe src={currentDocumentUrl} title="Document Preview" className="border-none" />
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDocumentViewOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface UploadFormProps {
  handleFileUpload: (file: File | null, documentType: string) => Promise<void>;
  documentTypes: DocumentType[] | undefined;
  onClose: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ handleFileUpload, documentTypes, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !selectedDocumentType) {
      alert('Por favor, selecciona un archivo y un tipo de documento.');
      return;
    }
    await handleFileUpload(selectedFile, selectedDocumentType);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="documentType" className="text-right">
            Tipo de Documento
          </Label>
          <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes?.map((type) => (
                <SelectItem key={type.id} value={type.name}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="file" className="text-right">
            Archivo
          </Label>
          <Input
            id="file"
            type="file"
            className="col-span-3"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Subir</Button>
      </DialogFooter>
    </form>
  );
};

export default MemberDetails;
