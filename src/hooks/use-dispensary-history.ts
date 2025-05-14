
import { useState, useEffect } from 'react';
import { db } from '@/lib/db';

interface DispensaryRecord {
  id?: number;
  memberId: number;
  productId: number;
  quantity: number;
  price: number;
  paymentMethod: 'cash' | 'bizum' | 'wallet';
  notes?: string;
  userId: number;
  createdAt: Date;
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
        // Obtener registros de dispensario
        const dispensaryRecords = await db.dispensary
          .where('memberId')
          .equals(memberId)
          .reverse()
          .sortBy('createdAt');
        
        // Obtener información de productos
        const products = await db.products.toArray();
        
        // Combinar datos
        const enrichedRecords = dispensaryRecords.map(record => {
          const product = products.find(p => p.id === record.productId);
          return {
            ...record,
            productName: product ? product.name : 'Producto desconocido'
          };
        });

        // Calcular totales
        const dispensedTotal = enrichedRecords.reduce((sum, record) => sum + (record.quantity || 0), 0);
        const spentTotal = enrichedRecords.reduce((sum, record) => sum + (record.price || 0), 0);
        
        setRecords(enrichedRecords);
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
