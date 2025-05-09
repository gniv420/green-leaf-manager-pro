
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Cannabis } from 'lucide-react';
import { formatDecimal } from '@/lib/utils';

interface MemberDispensaryHistoryProps {
  memberId?: number;
}

const MemberDispensaryHistory: React.FC<MemberDispensaryHistoryProps> = ({ memberId }) => {
  const dispensaryRecords = useLiveQuery(
    async () => {
      if (!memberId) return [];
      
      const records = await db.dispensary
        .where('memberId')
        .equals(memberId)
        .reverse()
        .sortBy('createdAt');
      
      // Obtener información de productos
      const products = await db.products.toArray();
      
      return records.map(record => {
        const product = products.find(p => p.id === record.productId);
        return {
          ...record,
          productName: product ? product.name : 'Producto desconocido'
        };
      });
    },
    [memberId]
  );

  // Obtener el saldo actual del socio
  const member = useLiveQuery(
    async () => {
      if (!memberId) return null;
      return db.members.get(memberId);
    },
    [memberId]
  );

  if (!dispensaryRecords) {
    return (
      <div className="text-center p-4">
        <p>Cargando datos...</p>
      </div>
    );
  }

  if (dispensaryRecords.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Cannabis className="mx-auto h-8 w-8 mb-2 opacity-30" />
        <p>Este socio no tiene dispensaciones registradas</p>
      </div>
    );
  }

  // Calcular totales
  const totalDispensed = dispensaryRecords.reduce((sum, record) => sum + record.quantity, 0);
  const totalSpent = dispensaryRecords.reduce((sum, record) => sum + record.price, 0);
  const currentBalance = member?.balance || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total dispensado</p>
          <p className="text-xl font-bold">{formatDecimal(totalDispensed)} g</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total gastado</p>
          <p className="text-xl font-bold">{formatDecimal(totalSpent)} €</p>
        </div>
        <div className={`p-4 border rounded-lg ${currentBalance < 0 ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : currentBalance > 0 ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : ''}`}>
          <p className="text-sm text-muted-foreground">Saldo monedero</p>
          <p className={`text-xl font-bold ${currentBalance < 0 ? 'text-red-600 dark:text-red-400' : currentBalance > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
            {formatDecimal(currentBalance)} €
          </p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead className="text-right">Precio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispensaryRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  {format(new Date(record.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                </TableCell>
                <TableCell>{record.productName}</TableCell>
                <TableCell>{formatDecimal(record.quantity)} g</TableCell>
                <TableCell className="text-right">{formatDecimal(record.price)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MemberDispensaryHistory;
