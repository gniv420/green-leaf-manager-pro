
import { useState, useEffect } from 'react';
import { db } from '@/lib/sqlite-db';

interface DispensaryRecord {
  id?: number;
  memberId: number;
  productId: number;
  quantity: number;
  price: number;
  paymentMethod: 'cash' | 'bizum' | 'wallet';
  notes?: string;
  userId: number;
  createdAt: string;
  productName?: string;
}

export function useDispensaryHistory(memberId?: number) {
  const [records, setRecords] = useState<DispensaryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalDispensed, setTotalDispensed] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);

  useEffect(() => {
    if (!memberId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const fetchRecords = async () => {
      try {
        setLoading(true);
        // Obtener registros de dispensario desde SQLite
        const dispensaryRecords = await db.getDispensaryForMember(memberId);
        
        // Obtener información de productos
        const products = await db.getProducts();
        
        // Combinar datos
        const enrichedRecords = dispensaryRecords.map(record => {
          const product = products.find(p => p.id === record.productId);
          return {
            ...record,
            productName: product ? product.name : 'Producto desconocido'
          };
        });

        // Ordenar por fecha descendente
        const sortedRecords = enrichedRecords.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        // Calcular totales
        const dispensedTotal = sortedRecords.reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);
        const spentTotal = sortedRecords.reduce((sum, record) => sum + (Number(record.price) || 0), 0);
        
        setRecords(sortedRecords);
        setTotalDispensed(dispensedTotal);
        setTotalSpent(spentTotal);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error loading dispensary records'));
        console.error('Error loading dispensary records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [memberId]);

  return {
    records,
    loading,
    error,
    totalDispensed,
    totalSpent
  };
}
