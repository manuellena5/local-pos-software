import { useState, useEffect, useCallback } from 'react';
import { paymentMethodsApi } from '@/lib/api/paymentMethods';
import type { PaymentMethodConfig } from '@shared/types';

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await paymentMethodsApi.list();
      setMethods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar medios de pago');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMethods();
  }, [fetchMethods]);

  return { methods, isLoading, error, refetch: fetchMethods };
}
