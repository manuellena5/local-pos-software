import { useState, useEffect, useCallback, useRef } from 'react';
import { invoicesApi, type InvoiceStats } from '@/lib/api/invoices';
import type { PendingInvoice } from '@shared/types';

const POLL_INTERVAL_MS = 30_000; // 30 segundos

export function useInvoiceQueue(businessUnitId: number | undefined) {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [queue, setQueue] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    if (!businessUnitId) return;
    try {
      const [s, q] = await Promise.all([
        invoicesApi.getStats(businessUnitId),
        invoicesApi.getQueue(businessUnitId),
      ]);
      setStats(s);
      setQueue(q);
    } catch {
      // silenciar — el badge simplemente no aparece si el servidor no responde
    }
  }, [businessUnitId]);

  useEffect(() => {
    if (!businessUnitId) return;
    setLoading(true);
    fetchStats().finally(() => setLoading(false));

    intervalRef.current = setInterval(fetchStats, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [businessUnitId, fetchStats]);

  const retry = useCallback(
    async (saleId: number) => {
      if (!businessUnitId) return;
      await invoicesApi.retry(saleId, businessUnitId);
      await fetchStats();
    },
    [businessUnitId, fetchStats],
  );

  return { stats, queue, loading, refetch: fetchStats, retry };
}
