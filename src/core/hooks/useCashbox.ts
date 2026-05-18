import { useState, useEffect, useCallback } from 'react';
import { cashboxApi, type CashBalance } from '@/lib/api/cashbox';
import type { CashAudit, CashSessionStatus } from '@shared/types';

export function useCashbox(businessUnitId: number | undefined) {
  const [balance, setBalance] = useState<CashBalance | null>(null);
  const [audits, setAudits] = useState<CashAudit[]>([]);
  const [sessionStatus, setSessionStatus] = useState<CashSessionStatus>('never_opened');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const [bal, aud, statusRes] = await Promise.all([
        cashboxApi.getBalance(businessUnitId),
        cashboxApi.getAudits(businessUnitId),
        cashboxApi.getStatus(businessUnitId),
      ]);
      setBalance(bal);
      setAudits(aud);
      setSessionStatus(statusRes.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { balance, audits, sessionStatus, loading, error, refetch: fetch };
}
