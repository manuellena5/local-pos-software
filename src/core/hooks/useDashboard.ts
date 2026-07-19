import { useState, useEffect, useCallback, useRef } from 'react';
import { reportsApi } from '@/lib/api/reports';
import { useAppStore } from '@/core/store/appStore';
import type { DashboardDTO } from '@shared/types';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface UseDashboardReturn {
  data: DashboardDTO | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const activeBU = useAppStore((s) => s.activeBU);
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!activeBU) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getDashboard(activeBU.id);
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [activeBU]);

  useEffect(() => {
    void load();

    intervalRef.current = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
