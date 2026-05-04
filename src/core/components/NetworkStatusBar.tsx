import { useState } from 'react';
import { useNetworkStatus } from '@/core/hooks/useNetworkStatus';

function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'hace un momento';
  if (diffMin === 1) return 'hace 1 min';
  if (diffMin < 60)  return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  return diffH === 1 ? 'hace 1 h' : `hace ${diffH} h`;
}

export function NetworkStatusBar() {
  const { isOnline, pendingSync, lastSyncAt, isSyncing, triggerSync } = useNetworkStatus();
  const [showPanel, setShowPanel] = useState(false);

  // ── Indicador compacto ───────────────────────────────────────────────────
  const indicator = isSyncing ? (
    <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 cursor-pointer"
      onClick={() => setShowPanel((v) => !v)}>
      <span className="animate-spin text-sm">⟳</span>
      Sincronizando...
    </span>
  ) : !isOnline ? (
    <span className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 cursor-pointer"
      onClick={() => setShowPanel((v) => !v)}>
      🔴 Offline{pendingSync > 0 ? ` · ${pendingSync} pendientes` : ''}
    </span>
  ) : pendingSync > 0 ? (
    <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 cursor-pointer"
      onClick={() => setShowPanel((v) => !v)}>
      🟡 Online · {pendingSync} pendientes
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 cursor-pointer"
      onClick={() => setShowPanel((v) => !v)}>
      🟢 Online{lastSyncAt ? ` · sync ${timeAgo(lastSyncAt)}` : ''}
    </span>
  );

  return (
    <div className="relative">
      {indicator}

      {/* Panel de detalle */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Estado de sincronización</h3>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
          </div>

          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Conexión</span>
              <span className={isOnline ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cambios pendientes</span>
              <span className={pendingSync > 0 ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                {pendingSync}
              </span>
            </div>
            {lastSyncAt && (
              <div className="flex justify-between">
                <span>Último sync</span>
                <span>{timeAgo(lastSyncAt)}</span>
              </div>
            )}
          </div>

          {isOnline && (
            <button
              onClick={() => { void triggerSync(); }}
              disabled={isSyncing}
              className="w-full py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSyncing ? '⟳ Sincronizando...' : '⟳ Sincronizar ahora'}
            </button>
          )}

          {!isOnline && pendingSync > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">
              Los cambios se sincronizarán automáticamente al recuperar conexión.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
