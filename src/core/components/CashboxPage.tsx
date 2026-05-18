import { useState } from 'react';
import { useCashbox } from '@/core/hooks/useCashbox';
import { cashboxApi } from '@/lib/api/cashbox';
import { CashMovementLog } from './CashMovementLog';
import { CashAuditForm } from './CashAuditForm';
import type { CashAudit } from '@shared/types';

type CashTab = 'movements' | 'audit' | 'history';

interface Props {
  businessUnitId: number;
}

const STATUS_LABELS: Record<CashAudit['status'], string> = {
  balanced: '✓ Cuadra',
  discrepancy: '⚠ Discrepancia',
  discrepancy_resolved: '✓ Resuelta',
};

const STATUS_COLORS: Record<CashAudit['status'], string> = {
  balanced: 'text-green-600',
  discrepancy: 'text-orange-600',
  discrepancy_resolved: 'text-blue-600',
};

function OpenSessionPanel({ businessUnitId, onOpened }: { businessUnitId: number; onOpened: () => void }) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleOpen() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
      setErr('Ingresá un monto inicial válido (puede ser 0).');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await cashboxApi.openSession(businessUnitId, parsed);
      onOpened();
    } catch {
      setErr('Error al abrir la caja. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="text-5xl">🔒</div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">No hay caja abierta</p>
        <p className="text-sm text-gray-500 mt-1">
          Abrí una nueva sesión para registrar movimientos y ventas.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Monto inicial en caja ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <button
          onClick={handleOpen}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {submitting ? 'Abriendo...' : 'Abrir nueva caja'}
        </button>
      </div>
    </div>
  );
}

function ClosedSessionPanel({ lastAudit, onReopen }: { lastAudit: CashAudit | null; onReopen: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="text-5xl">✅</div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Caja cerrada</p>
        {lastAudit && (
          <p className="text-sm text-gray-500 mt-1">
            Último arqueo: {lastAudit.auditDate} · Diferencia: ${lastAudit.difference.toFixed(2)}
          </p>
        )}
        <p className="text-sm text-gray-400 mt-1">Para operar, abrí una nueva sesión.</p>
      </div>
      <button
        onClick={onReopen}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition-colors"
      >
        Abrir nueva caja
      </button>
    </div>
  );
}

export function CashboxPage({ businessUnitId }: Props) {
  const [tab, setTab] = useState<CashTab>('movements');
  const [showOpenPanel, setShowOpenPanel] = useState(false);
  const { balance, audits, sessionStatus, loading, refetch } = useCashbox(businessUnitId);

  const today = new Date().toISOString().slice(0, 10);
  const lastAudit = audits[0] ?? null;

  function handleAuditDone() {
    refetch();
    setTab('history');
  }

  function handleOpened() {
    refetch();
    setShowOpenPanel(false);
  }

  if (loading) {
    return <p className="text-center text-gray-400 py-8">Cargando caja...</p>;
  }

  // Sesión cerrada o nunca abierta
  if (sessionStatus !== 'open' && !showOpenPanel) {
    if (sessionStatus === 'never_opened') {
      return <OpenSessionPanel businessUnitId={businessUnitId} onOpened={handleOpened} />;
    }
    return (
      <ClosedSessionPanel
        lastAudit={lastAudit}
        onReopen={() => setShowOpenPanel(true)}
      />
    );
  }

  // Panel de apertura solicitado desde estado cerrado
  if (showOpenPanel) {
    return <OpenSessionPanel businessUnitId={businessUnitId} onOpened={handleOpened} />;
  }

  // Sesión abierta — flujo normal
  return (
    <div className="space-y-4">
      {/* Balance del día */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">Balance teórico</p>
          <p className="text-3xl font-bold text-emerald-700">
            ${balance?.theoretical.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-xs text-emerald-500 mt-1">Suma de todos los movimientos</p>
        </div>
        <div className={`rounded-xl p-4 ${lastAudit?.status === 'discrepancy' ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Último arqueo</p>
          {lastAudit ? (
            <>
              <p className={`text-lg font-bold ${STATUS_COLORS[lastAudit.status]}`}>
                {STATUS_LABELS[lastAudit.status]}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {lastAudit.auditDate} · Diferencia: ${lastAudit.difference.toFixed(2)}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin arqueos</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'movements', label: 'Movimientos de hoy' },
          { key: 'audit', label: 'Hacer arqueo' },
          { key: 'history', label: 'Historial de arqueos' },
        ] as { key: CashTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'movements' && (
        <CashMovementLog
          businessUnitId={businessUnitId}
          fromDate={today}
          toDate={today}
          onRefresh={refetch}
        />
      )}

      {tab === 'audit' && (
        <div className="max-w-md">
          <CashAuditForm
            businessUnitId={businessUnitId}
            theoreticalBalance={balance?.theoretical ?? 0}
            onAuditDone={handleAuditDone}
          />
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {audits.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin arqueos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Fecha</th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Teórico</th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Real</th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Diferencia</th>
                  <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Estado</th>
                  <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Notas</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{a.auditDate}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">${a.theoreticalBalance.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">${a.realBalance.toFixed(2)}</td>
                    <td className={`py-2.5 px-3 text-right font-semibold ${Math.abs(a.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      {a.difference >= 0 ? '+' : ''}${a.difference.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 text-xs">{a.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
