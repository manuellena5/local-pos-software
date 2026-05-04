import { useState, useEffect, useCallback } from 'react';
import { cashboxApi, type CashBalance } from '@/lib/api/cashbox';
import type { CashAudit } from '@shared/types';

export function useCashbox(businessUnitId: number | undefined) {
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [audits, setAudits] = useState<CashAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const [bal, aud] = await Promise.all([
        cashboxApi.getBalance(businessUnitId),
        cashboxApi.getAudits(businessUnitId),
      ]);
      setBalance(bal);
      setAudits(aud);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { balance, audits, loading, error, refetch: fetch };
}
