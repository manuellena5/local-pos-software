import { useEffect, useState } from 'react';
import { stockApi } from '@/lib/api/stock';
import type { StockSummary } from '@shared/types';

export function useStock(businessUnitId: number) {
  const [summary, setSummary] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stockApi.getSummary(businessUnitId);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [businessUnitId]);

  return { summary, loading, error, refetch };
}
