
import { useState, useEffect } from 'react';
import { CashRegister, db } from '@/lib/db';

export function useCurrentCashRegister() {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCashRegister = async () => {
      try {
        setLoading(true);
        const openRegister = await db.getOpenCashRegister();
        setCashRegister(openRegister || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error loading cash register'));
        console.error('Error loading cash register:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCashRegister();
  }, []);

  return {
    cashRegister,
    loading,
    error
  };
}
