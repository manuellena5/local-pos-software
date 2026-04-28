import { useState } from 'react';
import { useInvoiceQueue } from '@/core/hooks/useInvoiceQueue';

interface Props {
  businessUnitId: number | undefined;
}

export function InvoiceQueueStatus({ businessUnitId }: Props) {
  const { stats, queue, retry } = useInvoiceQueue(businessUnitId);
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);

  if (!stats) return null;

  // Solo mostramos el badge si hay algo que informar
  const hasPending = stats.pending > 0 || stats.failed > 0;

  const handleRetry = async (saleId: number) => {
    setRetrying(saleId);
    try {
      await retry(saleId);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          stats.failed > 0
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : hasPending
            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
        title="Estado de facturación AFIP"
      >
        <span>{stats.failed > 0 ? '⚠️' : hasPending ? '🕐' : '✅'}</span>
        <span>
          {stats.failed > 0
            ? `${stats.failed} falla${stats.failed > 1 ? 's' : ''}`
            : hasPending
            ? `${stats.pending} pendiente${stats.pending > 1 ? 's' : ''}`
            : `${stats.issued} emitida${stats.issued !== 1 ? 's' : ''}`}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Estado de Facturación AFIP</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Contadores */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-700">{stats.issued}</p>
              <p className="text-xs text-green-600">Emitidas</p>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded-lg">
              <p className="text-lg font-bold text-yellow-700">{stats.pending}</p>
              <p className="text-xs text-yellow-600">Pendientes</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <p className="text-lg font-bold text-red-700">{stats.failed}</p>
              <p className="text-xs text-red-600">Con error</p>
            </div>
          </div>

          {/* Cola de pendientes */}
          {queue.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Cola de reintentos
              </p>
              {queue.map((pi) => (
                <div
                  key={pi.id}
                  className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800">Venta #{pi.saleId}</p>
                    {pi.errorMessage && (
                      <p className="text-xs text-red-500 truncate" title={pi.errorMessage}>
                        {pi.errorMessage}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">Intentos: {pi.retryCount}</p>
                  </div>
                  <button
                    onClick={() => handleRetry(pi.saleId)}
                    disabled={retrying === pi.saleId}
                    className="shrink-0 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {retrying === pi.saleId ? '...' : 'Reintentar'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">
              {hasPending ? 'Cargando cola...' : 'No hay facturas pendientes'}
            </p>
          )}

          <p className="text-xs text-gray-400 mt-3 text-center">
            Se actualiza automáticamente cada 30 s
          </p>
        </div>
      )}
    </div>
  );
}
