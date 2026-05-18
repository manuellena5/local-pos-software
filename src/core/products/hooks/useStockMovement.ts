import { useState } from 'react';
import { productsApi } from '@/lib/api/products';
import type { CreateStockMovementRequest } from '@shared/types';

export function useStockMovement(productId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const submit = async (
    data: Omit<CreateStockMovementRequest, 'businessUnitId'>,
    businessUnitId: number,
  ): Promise<{ newQuantity: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await productsApi.createStockMovement(productId, {
        ...data,
        businessUnitId,
      });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar movimiento');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}
