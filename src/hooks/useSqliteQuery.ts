
import { useState, useEffect } from 'react';

// Hook genérico para consultas SQLite
export function useSqliteQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: any[] = []
): [T | undefined, boolean, Error | null] {
  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    queryFn()
      .then((result) => {
        if (isMounted) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return [data, isLoading, error];
}
