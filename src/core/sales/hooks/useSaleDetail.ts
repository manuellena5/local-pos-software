import { useState, useEffect, useCallback } from 'react';
import { salesApi } from '@/lib/api/sales';
import type { SaleWithItems } from '@shared/types';

export function useSaleDetail(saleId: number | null, businessUnitId: number | undefined) {
  const [detail, setDetail] = useState<SaleWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!saleId || !businessUnitId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.get(saleId, businessUnitId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalle');
    } finally {
      setLoading(false);
    }
  }, [saleId, businessUnitId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { detail, loading, error, refetch: fetchDetail };
}
