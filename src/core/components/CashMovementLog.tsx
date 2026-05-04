import { useState, useEffect } from 'react';
import { cashboxApi } from '@/lib/api/cashbox';
import type { CashMovement, CashMovementType } from '@shared/types';

const TYPE_LABELS: Record<CashMovementType, string> = {
  sale: 'Venta',
  refund: 'Devolución',
  deposit: 'Depósito',
  withdrawal: 'Retiro',
  other: 'Otro',
};

const TYPE_COLORS: Record<CashMovementType, string> = {
  sale: 'bg-green-100 text-green-700',
  refund: 'bg-orange-100 text-orange-700',
  deposit: 'bg-blue-100 text-blue-700',
  withdrawal: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-600',
};

interface Props {
  businessUnitId: number;
  fromDate?: string;
  toDate?: string;
  onRefresh?: () => void;
}

export function CashMovementLog({ businessUnitId, fromDate, toDate, onRefresh }: Props) {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMovement, setNewMovement] = useState({ type: 'deposit' as CashMovementType, amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadMovements() {
    setLoading(true);
    try {
      const data = await cashboxApi.getMovements(businessUnitId, { fromDate, toDate });
      setMovements(data);
    } catch {
      // silenciar
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMovements(); }, [businessUnitId, fromDate, toDate]);

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(newMovement.amount);
    if (!amount || amount <= 0) { setSaveError('El monto debe ser mayor a 0'); return; }
    if (!newMovement.description.trim()) { setSaveError('La descripción es obligatoria'); return; }
    setSaving(true); setSaveError(null);
    try {
      await cashboxApi.recordMovement(businessUnitId, {
        type: newMovement.type,
        amount,
        description: newMovement.description,
      });
      setNewMovement({ type: 'deposit', amount: '', description: '' });
      setShowAddForm(false);
      await loadMovements();
      onRefresh?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const balance = movements.reduce((total, m) => {
    if (m.type === 'refund' || m.type === 'withdrawal') return total - m.amount;
    return total + m.amount;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header con balance y botón agregar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-500">Balance del período: </span>
          <span className={`text-lg font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            ${balance.toFixed(2)}
          </span>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Movimiento manual
        </button>
      </div>

      {/* Formulario agregar movimiento */}
      {showAddForm && (
        <form onSubmit={handleAddMovement} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={newMovement.type}
                onChange={(e) => setNewMovement((p) => ({ ...p, type: e.target.value as CashMovementType }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="deposit">Depósito (ingreso)</option>
                <option value="withdrawal">Retiro (egreso)</option>
                <option value="refund">Devolución</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto ($)</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={newMovement.amount}
                onChange={(e) => setNewMovement((p) => ({ ...p, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={newMovement.description}
              onChange={(e) => setNewMovement((p) => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              placeholder="Motivo del movimiento"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-1.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {/* Tabla de movimientos */}
      {loading ? (
        <p className="text-center text-gray-400 py-4 text-sm">Cargando movimientos...</p>
      ) : movements.length === 0 ? (
        <p className="text-center text-gray-400 py-4 text-sm">No hay movimientos en el período</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Hora</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Tipo</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Descripción</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const isEgress = m.type === 'refund' || m.type === 'withdrawal';
                return (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-400 font-mono text-xs">
                      {m.createdAt.slice(11, 16)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[m.type]}`}>
                        {TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{m.description}</td>
                    <td className={`py-2 px-3 text-right font-medium ${isEgress ? 'text-red-600' : 'text-green-700'}`}>
                      {isEgress ? '−' : '+'}${m.amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2 px-3">{movements.length} movimiento{movements.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}
