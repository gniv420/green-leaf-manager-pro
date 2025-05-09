
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Member, MemberTransaction } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import DocumentsSection from '@/components/DocumentsSection';
import { Eye, EyeOff, Plus, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import MemberDispensaryHistory from '@/components/MemberDispensaryHistory';

const MemberForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = id !== 'new';
  
  const [formData, setFormData] = useState<Omit<Member, 'id' | 'createdAt' | 'updatedAt'>>({
    firstName: '',
    lastName: '',
    memberCode: '',
    dob: new Date(),
    dni: '',
    email: '', // Keeping in the state but removed from the form
    phone: '666666666',
    address: '', // Keeping in the state but removed from the form
    city: '', // Keeping in the state but removed from the form
    postalCode: '', // Keeping in the state but removed from the form
    joinDate: new Date(),
    consumptionGrams: 0,
    status: 'active',
    sponsorId: null,
    balance: 0,
  });

  const [sponsors, setSponsors] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(true); // Changed to true by default
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionNotes, setTransactionNotes] = useState<string>('');
  const [transactions, setTransactions] = useState<MemberTransaction[]>([]);

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
              memberCode: member.memberCode,
              dob: new Date(member.dob),
              dni: member.dni,
              email: member.email || '',
              phone: member.phone,
              address: member.address || '',
              city: member.city || '',
              postalCode: member.postalCode || '',
              joinDate: member.joinDate,
              status: member.status,
              consumptionGrams: member.consumptionGrams,
              sponsorId: member.sponsorId,
              balance: member.balance || 0,
            });

            // Fetch member transactions
            if (memberId) {
              const memberTransactions = await db.memberTransactions
                .where('memberId')
                .equals(memberId)
                .reverse()
                .sortBy('createdAt');
              setTransactions(memberTransactions);
            }
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
        // Generate a member code for new members
        const memberCode = await db.generateMemberCode(formData.firstName, formData.lastName);
        
        await db.members.add({
          ...formData,
          memberCode,
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

  const maskedValue = (value: string) => {
    return value;
  };

  const handleWalletTransaction = async () => {
    if (!id || transactionAmount <= 0) return;

    try {
      const memberId = parseInt(id);
      const userId = 1; // En una app real, sería el usuario logueado
      
      // Add transaction record
      await db.memberTransactions.add({
        memberId,
        amount: transactionAmount,
        type: transactionType,
        notes: transactionNotes,
        userId,
        createdAt: new Date(),
      });

      // Update member balance
      const newBalance = transactionType === 'deposit' 
        ? formData.balance + transactionAmount 
        : formData.balance - transactionAmount;
      
      await db.members.update(memberId, { 
        balance: newBalance,
        updatedAt: new Date(),
      });

      // Update local state
      setFormData(prev => ({
        ...prev,
        balance: newBalance
      }));

      // Refresh transactions
      const updatedTransactions = await db.memberTransactions
        .where('memberId')
        .equals(memberId)
        .reverse()
        .sortBy('createdAt');
      setTransactions(updatedTransactions);

      toast({
        title: 'Monedero actualizado',
        description: `Se ha ${transactionType === 'deposit' ? 'añadido' : 'retirado'} ${transactionAmount}€ correctamente`
      });

      // Reset form
      setTransactionAmount(0);
      setTransactionNotes('');
      setWalletDialogOpen(false);
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo procesar la transacción'
      });
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

      {isEditing ? (
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="wallet">Monedero</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <form onSubmit={handleSubmit}>
              <Card className="border-green-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Datos personales</CardTitle>
                    <CardDescription>
                      Información básica del socio
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    type="button"
                    onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                    title={showSensitiveInfo ? "Ocultar información sensible" : "Mostrar información sensible"}
                  >
                    {showSensitiveInfo ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
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
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
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
                    <div className="space-y-2">
                      <Label htmlFor="balance">Balance del Monedero (€)</Label>
                      <div className="flex items-center">
                        <Input
                          id="balance"
                          type="number"
                          value={formData.balance}
                          readOnly
                          className="border-green-200 focus-visible:ring-green-500"
                        />
                      </div>
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
          </TabsContent>

          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Monedero Electrónico</CardTitle>
                    <CardDescription>Gestión del saldo del socio</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Balance Actual</div>
                    <div className="text-2xl font-bold text-green-600">{formData.balance.toFixed(2)} €</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-green-200 hover:bg-green-50"
                      onClick={() => {
                        setTransactionType('deposit');
                        setWalletDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4 text-green-600" /> Añadir Fondos
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-red-200 hover:bg-red-50"
                      disabled={formData.balance <= 0}
                      onClick={() => {
                        setTransactionType('withdrawal');
                        setWalletDialogOpen(true);
                      }}
                    >
                      <Minus className="mr-2 h-4 w-4 text-red-600" /> Retirar Fondos
                    </Button>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length > 0 ? (
                          transactions.map(transaction => (
                            <TableRow key={transaction.id}>
                              <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                                  {transaction.type === 'deposit' ? 'Ingreso' : 'Retirada'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                                  {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount.toFixed(2)} €
                                </span>
                              </TableCell>
                              <TableCell>{transaction.notes}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                              No hay transacciones registradas.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsSection memberId={parseInt(id!)} />
          </TabsContent>
        </Tabs>
      ) : (
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
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
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
      )}

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'deposit' ? 'Añadir Fondos' : 'Retirar Fondos'}
            </DialogTitle>
            <DialogDescription>
              {transactionType === 'deposit' 
                ? 'Introduce la cantidad a añadir al monedero del socio.'
                : 'Introduce la cantidad a retirar del monedero del socio.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Importe (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={transactionType === 'withdrawal' ? formData.balance : undefined}
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(Number(e.target.value))}
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Motivo de la transacción"
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setWalletDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleWalletTransaction}
              disabled={transactionAmount <= 0 || (transactionType === 'withdrawal' && transactionAmount > formData.balance)}
              className={transactionType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {transactionType === 'deposit' ? 'Añadir' : 'Retirar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberForm;
