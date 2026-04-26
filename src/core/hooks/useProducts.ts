import { useCallback, useEffect, useState } from 'react';
import { productsApi } from '@/lib/api/products';
import type { Product } from '@shared/types';

export function useProducts(businessUnitId: number, search?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const data = await productsApi.list(businessUnitId, search ? { search } : undefined);
      setProducts(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
      setLoading(false);
    }
  }, [businessUnitId, search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { products, loading, error, refetch };
}
