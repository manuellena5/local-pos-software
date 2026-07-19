import { useState } from 'react';
import { cashboxApi } from '@/lib/api/cashbox';
import type { CashAudit } from '@shared/types';

interface Props {
  businessUnitId: number;
  cashTheoretical: number;
  otherByMethod: {
    transfer: number;
    mercadopago: number;
    card: number;
    other: number;
  };
  onAuditDone: (audit: CashAudit) => void;
}

const OTHER_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
  card: 'Tarjeta',
  other: 'Otro',
};

export function CashAuditForm({ businessUnitId, cashTheoretical, otherByMethod, onAuditDone }: Props) {
  const [efectivoContado, setEfectivoContado] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contadoNum = parseFloat(efectivoContado) || 0;
  const difference = contadoNum - cashTheoretical;
  const isBalanced = Math.abs(difference) < 0.01;

  const otherEntries = Object.entries(otherByMethod).filter(([, v]) => v > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!efectivoContado || isNaN(contadoNum) || contadoNum < 0) {
      setError('Ingresá el efectivo contado (puede ser 0)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const audit = await cashboxApi.performAudit(businessUnitId, contadoNum, notes || undefined);
      onAuditDone(audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar arqueo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sección efectivo */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Efectivo esperado:</span>
          <span className="font-semibold text-gray-900">${cashTheoretical.toFixed(2)}</span>
        </div>
        {efectivoContado !== '' && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Efectivo contado:</span>
              <span className="font-semibold text-gray-900">${contadoNum.toFixed(2)}</span>
            </div>
            <div
              className={`flex justify-between font-semibold border-t pt-2 mt-1 ${
                isBalanced ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>Diferencia:</span>
              <span>
                {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
              </span>
            </div>
            {!isBalanced && (
              <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                ⚠ Diferencia de ${Math.abs(difference).toFixed(2)}. Se registrará como
                &quot;discrepancia&quot;.
              </p>
            )}
            {isBalanced && (
              <p className="text-xs text-green-600 bg-green-50 rounded px-2 py-1">
                ✓ La caja cuadra perfectamente.
              </p>
            )}
          </>
        )}
      </div>

      {/* Otros medios — informativo */}
      {otherEntries.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Otros medios (informativo)
          </p>
          {otherEntries.map(([method, amount]) => (
            <div key={method} className="flex justify-between">
              <span className="text-gray-500">{OTHER_LABELS[method] ?? method}:</span>
              <span className="font-medium text-gray-700">${amount.toFixed(2)}</span>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 leading-relaxed">
            Verificar contra extracto bancario y resumen de Mercado Pago.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Efectivo contado ($) *
        </label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={efectivoContado}
          onChange={(e) => setEfectivoContado(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ingresá el efectivo contado en caja"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Observaciones sobre el arqueo..."
        />
      </div>

      <button
        type="submit"
        disabled={saving || !efectivoContado}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Registrando arqueo...' : 'Registrar arqueo'}
      </button>
    </form>
  );
}
