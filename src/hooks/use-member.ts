
import { useState, useEffect } from 'react';
import { db, Member } from '@/lib/db';

export function useMember(memberId?: number) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memberId) {
      setMember(null);
      setLoading(false);
      return;
    }

    const fetchMember = async () => {
      try {
        setLoading(true);
        const memberData = await db.members.get(memberId);
        setMember(memberData || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error loading member'));
        console.error('Error loading member:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [memberId]);

  return {
    member,
    loading,
    error
  };
}
