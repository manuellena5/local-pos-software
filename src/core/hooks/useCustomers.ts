import { useState, useEffect, useCallback } from 'react';
import { customersApi } from '@/lib/api/customers';
import type { Customer } from '@shared/types';

export function useCustomers(search?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customersApi.list(search ? { q: search } : undefined);
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { customers, loading, error, refetch: fetch };
}
