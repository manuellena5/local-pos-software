import { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '@/lib/api/reports';
import type { DashboardData } from '@shared/types';

export function useDashboard(businessUnitId: number, moduleId: string) {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getDashboard(businessUnitId, moduleId);
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, moduleId]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, refetch: load };
}
