import { useState } from 'react';
import { cashboxApi } from '@/lib/api/cashbox';
import type { CashAudit } from '@shared/types';

interface Props {
  businessUnitId: number;
  theoreticalBalance: number;
  onAuditDone: (audit: CashAudit) => void;
}

export function CashAuditForm({ businessUnitId, theoreticalBalance, onAuditDone }: Props) {
  const [realBalance, setRealBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realNum = parseFloat(realBalance) || 0;
  const difference = realNum - theoreticalBalance;
  const isBalanced = Math.abs(difference) < 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!realBalance || isNaN(realNum) || realNum < 0) {
      setError('Ingresá un balance real válido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const audit = await cashboxApi.performAudit(businessUnitId, realNum, notes || undefined);
      onAuditDone(audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar arqueo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Balance teórico (sistema):</span>
          <span className="font-semibold text-gray-900">${theoreticalBalance.toFixed(2)}</span>
        </div>
        {realBalance !== '' && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">Balance real ingresado:</span>
              <span className="font-semibold text-gray-900">${realNum.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between font-semibold border-t pt-2 mt-1 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              <span>Diferencia:</span>
              <span>{difference >= 0 ? '+' : ''}${difference.toFixed(2)}</span>
            </div>
            {!isBalanced && (
              <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                ⚠ Hay una discrepancia de ${Math.abs(difference).toFixed(2)}. Se registrará como &quot;discrepancia&quot;.
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

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Balance real en caja ($) *
        </label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={realBalance}
          onChange={(e) => setRealBalance(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ingresá el monto contado en caja"
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
        disabled={saving || !realBalance}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Registrando arqueo...' : 'Registrar arqueo'}
      </button>
    </form>
  );
}
