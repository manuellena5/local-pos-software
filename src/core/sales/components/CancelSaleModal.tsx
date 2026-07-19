import { useState } from 'react';
import { salesApi } from '@/lib/api/sales';
import type { CancelSaleResponse } from '@/lib/api/sales';

interface Props {
  saleId: number;
  saleNumber: number;
  businessUnitId: number;
  onCancelled: (response: CancelSaleResponse) => void;
  onClose: () => void;
}

export function CancelSaleModal({ saleId, saleNumber, businessUnitId, onCancelled, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_REASON_LENGTH = 10;
  const reasonTooShort = reason.trim().length < MIN_REASON_LENGTH;

  async function handleConfirm() {
    if (reasonTooShort) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await salesApi.cancel(saleId, businessUnitId, reason.trim());
      onCancelled(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al anular la venta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Anular venta #{saleNumber}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Esta acción revierte el stock y registra un egreso en caja.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Motivo de anulación <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describí el motivo de la anulación (mínimo 10 caracteres)..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <p className={`text-xs mt-1 ${reasonTooShort ? 'text-gray-400' : 'text-green-600'}`}>
              {reason.trim().length}/{MIN_REASON_LENGTH} caracteres mínimos
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <p className="text-xs text-amber-800 font-medium">⚠ Efectos de la anulación:</p>
            <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
              <li>El stock de todos los ítems será devuelto al inventario</li>
              <li>Se registrará un egreso de caja si la caja está abierta</li>
              <li>La venta quedará marcada como &ldquo;Anulada&rdquo; en el historial</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || reasonTooShort}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {submitting ? 'Anulando...' : 'Confirmar anulación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
