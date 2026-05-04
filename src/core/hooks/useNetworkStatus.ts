/**
 * Hook de estado de red.
 *
 * Combina dos fuentes:
 * 1. navigator.onLine — rápido, inmediato
 * 2. ping a /api/health cada 30 s — detecta captive portals y pérdidas parciales
 *
 * También consulta /api/public/sync/status para saber cuántos cambios
 * están pendientes de sincronizar.
 */

import { useState, useEffect, useCallback } from 'react';

const SERVER = 'http://localhost:3001';
const PING_INTERVAL_MS = 30_000;

export interface NetworkStatus {
  isOnline: boolean;        // conexión real verificada
  pendingSync: number;      // ítems en cola de sync
  lastSyncAt: string | null; // ISO timestamp del último sync exitoso
  isSyncing: boolean;
}

export function useNetworkStatus(): NetworkStatus & { triggerSync: () => Promise<void> } {
  const [isOnline, setIsOnline]       = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [lastSyncAt, setLastSyncAt]   = useState<string | null>(null);
  const [isSyncing, setIsSyncing]     = useState(false);

  // Verificar conectividad real contra el servidor local
  const checkServer = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/api/health`, { signal: AbortSignal.timeout(5000) });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  // Consultar estado de sync
  const checkSyncStatus = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/api/public/sync/status`);
      if (!res.ok) return;
      const json = (await res.json()) as {
        data: { pendingItems: number; recentLogs: Array<{ status: string; createdAt: string }> };
      };
      setPendingSync(json.data.pendingItems);

      // Último sync exitoso
      const okLog = [...json.data.recentLogs].reverse().find((l) => l.status === 'ok');
      if (okLog) setLastSyncAt(okLog.createdAt);
    } catch {
      // silenciar — el servidor puede no estar disponible aún
    }
  }, []);

  // Disparar sync manual
  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await fetch(`${SERVER}/api/sync/trigger`, { method: 'POST' });
      await checkSyncStatus();
    } catch {
      // silenciar
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkSyncStatus]);

  useEffect(() => {
    // Escuchar eventos del navegador
    const onOnline  = () => { setIsOnline(true);  checkSyncStatus(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    // Ping periódico
    checkServer();
    checkSyncStatus();
    const intervalId = setInterval(() => {
      checkServer();
      checkSyncStatus();
    }, PING_INTERVAL_MS);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, pendingSync, lastSyncAt, isSyncing, triggerSync };
}
