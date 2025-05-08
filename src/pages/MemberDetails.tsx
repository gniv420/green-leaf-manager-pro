
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Member as MemberType, Document as DocumentType } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Upload, Eye, Trash2, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentsSection from '@/components/DocumentsSection';
import MemberDispensaryHistory from '@/components/MemberDispensaryHistory';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const MemberDetails = () => {
  const { id } = useParams<{ id: string }>();
  const memberId = parseInt(id || '0');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [member, setMember] = useState<MemberType | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [transactionAmount, setTransactionAmount] = useState<number>(0);
  const [transactionNotes, setTransactionNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchMember = async () => {
      if (!memberId) return;
      
      try {
        const memberData = await db.members.get(memberId);
        if (memberData) {
          setMember(memberData);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se encontró el socio'
          });
          navigate('/members');
        }
      } catch (error) {
        console.error('Error fetching member:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo cargar la información del socio'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMember();
  }, [memberId, navigate, toast]);
  
  const handleOpenTransactionDialog = (type: 'deposit' | 'withdrawal') => {
    setTransactionType(type);
    setTransactionAmount(0);
    setTransactionNotes('');
    setIsTransactionDialogOpen(true);
  };
  
  const handleTransaction = async () => {
    if (!member || !member.id || transactionAmount <= 0) return;
    
    try {
      // En una aplicación real, obtendríamos el userId del contexto de autenticación
      const userId = 1; // Usando el admin por defecto
      
      // Obtener registro de caja abierta
      const currentCashRegister = await db.cashRegisters
        .where('status')
        .equals('open')
        .first();
        
      if (!currentCashRegister) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Debe abrir una caja para realizar operaciones con saldo'
        });
        return;
      }
      
      // Calcular nuevo saldo
      const newBalance = transactionType === 'deposit' 
        ? (member.balance || 0) + transactionAmount
        : (member.balance || 0) - transactionAmount;
        
      // Validar que hay suficiente saldo para retiradas
      if (transactionType === 'withdrawal' && newBalance < 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Saldo insuficiente para realizar esta operación'
        });
        return;
      }
      
      // Registrar transacción del socio
      await db.memberTransactions.add({
        memberId: member.id,
        amount: transactionAmount,
        type: transactionType,
        notes: transactionNotes,
        userId,
        createdAt: new Date()
      });
      
      // Actualizar saldo del socio
      await db.members.update(member.id, {
        balance: newBalance,
        updatedAt: new Date()
      });
      
      // Registrar en caja
      await db.cashTransactions.add({
        type: transactionType === 'deposit' ? 'income' : 'expense',
        amount: transactionAmount,
        concept: `${transactionType === 'deposit' ? 'Depósito' : 'Retirada'} de saldo`,
        notes: `Socio: ${member.firstName} ${member.lastName} - ${transactionNotes}`,
        userId,
        cashRegisterId: currentCashRegister.id,
        paymentMethod: 'cash', // Añadimos el método de pago por defecto
        createdAt: new Date()
      });
      
      // Actualizar estado local
      setMember({
        ...member,
        balance: newBalance
      });
      
      toast({
        title: 'Operación exitosa',
        description: `Se ha ${transactionType === 'deposit' ? 'añadido' : 'retirado'} saldo correctamente`
      });
      
      setIsTransactionDialogOpen(false);
      
    } catch (error) {
      console.error('Error in transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo completar la operación'
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

  if (!member) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/members')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-muted-foreground">
            <span className="font-mono">{member.memberCode}</span> · DNI: {member.dni}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenTransactionDialog('deposit')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir Saldo
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenTransactionDialog('withdrawal')}
            disabled={(member.balance || 0) <= 0}
          >
            <Minus className="mr-2 h-4 w-4" />
            Retirar Saldo
          </Button>
        </div>
      </div>
      
      {/* Tarjeta de información general y saldo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Información General</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Fecha de nacimiento</p>
            <p className="font-medium">{format(new Date(member.dob), 'dd/MM/yyyy', { locale: es })}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Consumo mensual</p>
            <p className="font-medium">{member.consumptionGrams} gramos</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Fecha de registro</p>
            <p className="font-medium">{format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: es })}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Saldo disponible</p>
            <p className="text-2xl font-bold text-green-600">{(member.balance || 0).toFixed(2)} €</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Pestañas para documentos e historial */}
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="dispensary">Historial de Dispensaciones</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents" className="pt-4">
          <DocumentsSection memberId={memberId} />
        </TabsContent>
        
        <TabsContent value="dispensary" className="pt-4">
          <MemberDispensaryHistory memberId={memberId} />
        </TabsContent>
      </Tabs>
      
      {/* Diálogo para transactions */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'deposit' ? 'Añadir Saldo' : 'Retirar Saldo'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Saldo actual: <span className="font-medium">{(member.balance || 0).toFixed(2)} €</span>
              </p>
              
              <label htmlFor="amount" className="block text-sm font-medium mb-1">
                Importe (€)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={transactionType === 'withdrawal' ? member.balance || 0 : undefined}
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(parseFloat(e.target.value) || 0)}
              />
              
              {transactionType === 'deposit' && (
                <p className="text-xs text-green-600 mt-1">
                  Nuevo saldo: {((member.balance || 0) + transactionAmount).toFixed(2)} €
                </p>
              )}
              
              {transactionType === 'withdrawal' && (
                <p className="text-xs text-amber-600 mt-1">
                  Nuevo saldo: {((member.balance || 0) - transactionAmount).toFixed(2)} €
                </p>
              )}
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notas (opcional)
              </label>
              <Input
                id="notes"
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Añadir notas a esta transacción..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleTransaction}
              disabled={transactionAmount <= 0}
              variant={transactionType === 'deposit' ? 'default' : 'secondary'}
            >
              {transactionType === 'deposit' ? 'Añadir Saldo' : 'Retirar Saldo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDetails;
