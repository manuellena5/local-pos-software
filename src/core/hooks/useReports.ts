import { useState, useCallback } from 'react';
import { reportsApi } from '@/lib/api/reports';
import type { SalesReport, TopProductsReport, TopCustomersReport } from '@shared/types';

export function useSalesReport(businessUnitId: number | undefined) {
  const [data, setData] = useState<SalesReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (fromDate: string, toDate: string) => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getSalesReport(businessUnitId, fromDate, toDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  return { data, loading, error, load };
}

export function useTopProducts(businessUnitId: number | undefined, limit = 10) {
  const [data, setData] = useState<TopProductsReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getTopProducts(businessUnitId, limit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, limit]);

  return { data, loading, error, load };
}

export function useTopCustomers(businessUnitId: number | undefined, limit = 10) {
  const [data, setData] = useState<TopCustomersReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getTopCustomers(businessUnitId, limit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, limit]);

  return { data, loading, error, load };
}
