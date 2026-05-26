import { useState, useEffect, useCallback } from 'react';
import { cashboxApi, type CashSessionData, type AuditWithTimes } from '@/lib/api/cashbox';
import type { CashSessionStatus } from '@shared/types';

export function useCashbox(businessUnitId: number | undefined) {
  const [sessionData, setSessionData] = useState<CashSessionData | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditWithTimes[]>([]);
  const [sessionStatus, setSessionStatus] = useState<CashSessionStatus>('never_opened');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!businessUnitId) return;
    setLoading(true);
    setError(null);
    try {
      const [session, history, statusRes] = await Promise.all([
        cashboxApi.getSessionData(businessUnitId),
        cashboxApi.getAuditHistoryWithTimes(businessUnitId),
        cashboxApi.getStatus(businessUnitId),
      ]);
      setSessionData(session);
      setAuditHistory(history);
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

  return { sessionData, auditHistory, sessionStatus, loading, error, refetch: fetch };
}
