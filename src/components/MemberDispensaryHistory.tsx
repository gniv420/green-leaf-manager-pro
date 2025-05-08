
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

  if (!dispensaryRecords || dispensaryRecords.length === 0) {
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total dispensado</p>
          <p className="text-xl font-bold">{totalDispensed.toFixed(2)} g</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total gastado</p>
          <p className="text-xl font-bold">{totalSpent.toFixed(2)} €</p>
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
                <TableCell>{record.quantity.toFixed(2)} g</TableCell>
                <TableCell className="text-right">{record.price.toFixed(2)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MemberDispensaryHistory;
