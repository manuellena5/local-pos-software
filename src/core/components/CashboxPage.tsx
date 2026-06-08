import { useState } from 'react';
import { useCashbox } from '@/core/hooks/useCashbox';
import { cashboxApi } from '@/lib/api/cashbox';
import { CashAuditForm } from './CashAuditForm';
import { ReporteZModal } from './ReporteZModal';
import type { CashAudit, CashMovementType } from '@shared/types';
import type { AuditWithTimes } from '@/lib/api/cashbox';

interface Props {
  businessUnitId: number;
}

function fmtMoney(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

function fmtTime(dt: string): string {
  return dt.slice(11, 16);
}

function fmtDate(dt: string): string {
  const [y, m, d] = dt.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function isEgress(type: CashMovementType): boolean {
  return type === 'refund' || type === 'withdrawal';
}

const MOVEMENT_LABEL: Record<CashMovementType, string> = {
  opening: 'Apertura',
  sale: 'Venta',
  refund: 'Anulación',
  deposit: 'Ingreso',
  withdrawal: 'Egreso',
  other: 'Otro',
};

const MOVEMENT_BADGE: Record<CashMovementType, string> = {
  opening: 'bg-gray-100 text-gray-600',
  sale: 'bg-blue-100 text-blue-700',
  refund: 'bg-red-100 text-red-700',
  deposit: 'bg-green-100 text-green-700',
  withdrawal: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-500',
};

const AUDIT_STATUS_LABEL: Record<string, string> = {
  balanced: '✓ Cuadra',
  discrepancy: '⚠ Diferencia',
  discrepancy_resolved: '✓ Resuelta',
};

const AUDIT_STATUS_COLOR: Record<string, string> = {
  balanced: 'bg-green-100 text-green-700',
  discrepancy: 'bg-red-100 text-red-700',
  discrepancy_resolved: 'bg-blue-100 text-blue-700',
};

function BreakdownRow({ label, amount }: { label: string; amount: number }) {
  const isNeg = amount < 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-xs font-medium ${isNeg ? 'text-red-600' : 'text-green-700'}`}>
        {isNeg ? '−' : '+'}${Math.abs(amount).toFixed(2)}
      </span>
    </div>
  );
}

function OpenSessionPanel({
  businessUnitId,
  onOpened,
}: {
  businessUnitId: number;
  onOpened: () => void;
}) {
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
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Monto inicial en caja ($)
          </label>
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

function ClosedSessionPanel({
  lastAudit,
  onReopen,
}: {
  lastAudit: AuditWithTimes | null;
  onReopen: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="text-5xl">✅</div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Caja cerrada</p>
        {lastAudit && (
          <p className="text-sm text-gray-500 mt-1">
            Último cierre: {fmtDate(lastAudit.auditDate)} a las {fmtTime(lastAudit.closingAt)} ·
            Diferencia: {fmtMoney(lastAudit.difference)}
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

function AddMovementForm({
  businessUnitId,
  onSaved,
  onCancel,
}: {
  businessUnitId: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<CashMovementType>('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setErr('El monto debe ser mayor a 0');
      return;
    }
    if (!description.trim()) {
      setErr('La descripción es obligatoria');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await cashboxApi.recordMovement(businessUnitId, { type, amount: amountNum, description });
      onSaved();
    } catch (caughtErr) {
      setErr(caughtErr instanceof Error ? caughtErr.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 mb-4"
    >
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CashMovementType)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="deposit">Ingreso manual</option>
            <option value="withdrawal">Egreso manual</option>
            <option value="refund">Anulación</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Monto ($)</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
        <input
          type="text"
          placeholder="Motivo del movimiento"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Registrar'}
        </button>
      </div>
    </form>
  );
}

function AuditModal({
  businessUnitId,
  theoreticalBalance,
  onDone,
  onClose,
}: {
  businessUnitId: number;
  theoreticalBalance: number;
  onDone: (audit: CashAudit) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Cerrar caja — Arqueo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <CashAuditForm
          businessUnitId={businessUnitId}
          theoreticalBalance={theoreticalBalance}
          onAuditDone={onDone}
        />
      </div>
    </div>
  );
}

export function CashboxPage({ businessUnitId }: Props) {
  const { sessionData, auditHistory, sessionStatus, loading, refetch } =
    useCashbox(businessUnitId);
  const [showOpenPanel, setShowOpenPanel] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [reporteZAuditId, setReporteZAuditId] = useState<number | null>(null);

  const reporteZOverlay = reporteZAuditId !== null ? (
    <ReporteZModal
      auditId={reporteZAuditId}
      businessUnitId={businessUnitId}
      onClose={() => setReporteZAuditId(null)}
    />
  ) : null;

  if (loading) {
    return <p className="text-center text-gray-400 py-8">Cargando caja...</p>;
  }

  if (sessionStatus !== 'open' && !showOpenPanel) {
    if (sessionStatus === 'never_opened') {
      return (
        <>
          {reporteZOverlay}
          <OpenSessionPanel businessUnitId={businessUnitId} onOpened={refetch} />
        </>
      );
    }
    return (
      <>
        {reporteZOverlay}
        <ClosedSessionPanel
          lastAudit={auditHistory[0] ?? null}
          onReopen={() => setShowOpenPanel(true)}
        />
      </>
    );
  }

  if (showOpenPanel) {
    return (
      <>
        {reporteZOverlay}
        <OpenSessionPanel
          businessUnitId={businessUnitId}
          onOpened={() => {
            setShowOpenPanel(false);
            refetch();
          }}
        />
      </>
    );
  }

  // Sesión abierta
  const movements = sessionData?.movements ?? [];
  const balance = sessionData?.balance ?? 0;
  const openingMovement = sessionData?.openingMovement ?? null;
  const lastAudit = auditHistory[0] ?? null;

  const openingAmt = movements.find((m) => m.type === 'opening')?.amount ?? 0;
  const salesAmt = movements.filter((m) => m.type === 'sale').reduce((s, m) => s + m.amount, 0);
  const depositsAmt = movements
    .filter((m) => m.type === 'deposit')
    .reduce((s, m) => s + m.amount, 0);
  const withdrawalsAmt = movements
    .filter((m) => m.type === 'withdrawal')
    .reduce((s, m) => s + m.amount, 0);
  const refundsAmt = movements
    .filter((m) => m.type === 'refund')
    .reduce((s, m) => s + m.amount, 0);
  const othersAmt = movements.filter((m) => m.type === 'other').reduce((s, m) => s + m.amount, 0);
  const egressAmt = withdrawalsAmt + refundsAmt;

  return (
    <>
      {showAuditModal && (
        <AuditModal
          businessUnitId={businessUnitId}
          theoreticalBalance={balance}
          onDone={(audit) => {
            setShowAuditModal(false);
            setReporteZAuditId(audit.id);
            refetch();
          }}
          onClose={() => setShowAuditModal(false)}
        />
      )}

      {reporteZOverlay}

      <div className="flex gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Card 1: Estado de caja */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900">Caja abierta</span>
            </div>
            {openingMovement && (
              <p className="text-xs text-gray-500">
                Abierta desde las {fmtTime(openingMovement.createdAt)}
              </p>
            )}
            <button
              onClick={() => setShowAuditModal(true)}
              className="w-full py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium border border-red-200 transition-colors"
            >
              Cerrar caja
            </button>
          </div>

          {/* Card 2: Saldo de sesión */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
              Saldo de sesión
            </p>
            <p
              className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}
            >
              {balance >= 0 ? '' : '−'}
              {fmtMoney(balance)}
            </p>
            <p className="text-xs text-blue-500 mt-1.5 leading-relaxed">
              Apertura {fmtMoney(openingAmt)}
              {salesAmt > 0 && ` + ventas ${fmtMoney(salesAmt)}`}
              {depositsAmt > 0 && ` + ingresos ${fmtMoney(depositsAmt)}`}
              {egressAmt > 0 && ` − egresos ${fmtMoney(egressAmt)}`}
              {othersAmt > 0 && ` + otros ${fmtMoney(othersAmt)}`}
            </p>
          </div>

          {/* Card 3: Composición + último arqueo */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Composición
            </p>
            <div className="space-y-1.5">
              {openingAmt > 0 && <BreakdownRow label="Apertura" amount={openingAmt} />}
              {salesAmt > 0 && <BreakdownRow label="Ventas" amount={salesAmt} />}
              {depositsAmt > 0 && <BreakdownRow label="Ingresos manuales" amount={depositsAmt} />}
              {withdrawalsAmt > 0 && (
                <BreakdownRow label="Egresos" amount={-withdrawalsAmt} />
              )}
              {refundsAmt > 0 && <BreakdownRow label="Anulaciones" amount={-refundsAmt} />}
              {othersAmt > 0 && <BreakdownRow label="Otros" amount={othersAmt} />}
              {movements.length === 0 && (
                <p className="text-xs text-gray-400">Sin movimientos</p>
              )}
            </div>
            {lastAudit && (
              <div className="pt-2 border-t border-gray-100">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${AUDIT_STATUS_COLOR[lastAudit.status]}`}
                >
                  {AUDIT_STATUS_LABEL[lastAudit.status]}
                  {lastAudit.status === 'discrepancy' &&
                    ` ${lastAudit.difference >= 0 ? '+' : '−'}${fmtMoney(lastAudit.difference)}`}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Último arqueo: {fmtDate(lastAudit.auditDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Movimientos de la sesión</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {movements.length} movimiento{movements.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowAddMovement((v) => !v)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Movimiento manual
            </button>
          </div>

          {showAddMovement && (
            <AddMovementForm
              businessUnitId={businessUnitId}
              onSaved={() => {
                setShowAddMovement(false);
                refetch();
              }}
              onCancel={() => setShowAddMovement(false)}
            />
          )}

          {movements.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <p className="text-sm">No hay movimientos en esta sesión.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">
                      Hora
                    </th>
                    <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">
                      Tipo
                    </th>
                    <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">
                      Descripción
                    </th>
                    <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400 font-mono text-xs">
                        {fmtTime(m.createdAt)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOVEMENT_BADGE[m.type]}`}
                        >
                          {MOVEMENT_LABEL[m.type]}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700">{m.description}</td>
                      <td
                        className={`py-2 px-3 text-right font-medium ${
                          isEgress(m.type) ? 'text-red-600' : 'text-green-700'
                        }`}
                      >
                        {isEgress(m.type) ? '−' : '+'}
                        {fmtMoney(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="py-2.5 px-3 text-sm font-semibold text-gray-700">
                      Balance de la sesión
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right text-sm font-bold ${
                        balance >= 0 ? 'text-blue-700' : 'text-red-700'
                      }`}
                    >
                      {balance >= 0 ? '+' : '−'}
                      {fmtMoney(balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: Historial de arqueos */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Historial de arqueos</h3>
        {auditHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin arqueos registrados</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs text-gray-500 font-medium py-2.5 px-4">
                    Fecha
                  </th>
                  <th className="text-left text-xs text-gray-500 font-medium py-2.5 px-4">
                    Apertura
                  </th>
                  <th className="text-left text-xs text-gray-500 font-medium py-2.5 px-4">
                    Cierre
                  </th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2.5 px-4">
                    Teórico
                  </th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2.5 px-4">
                    Real
                  </th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2.5 px-4">
                    Diferencia
                  </th>
                  <th className="text-left text-xs text-gray-500 font-medium py-2.5 px-4">
                    Estado
                  </th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {auditHistory.slice(0, 10).map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-medium text-gray-900">
                      {fmtDate(a.auditDate)}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">
                      {a.openingAt ? fmtTime(a.openingAt) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">
                      {fmtTime(a.closingAt)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-600">
                      {fmtMoney(a.theoreticalBalance)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-600">
                      {fmtMoney(a.realBalance)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-semibold ${
                        Math.abs(a.difference) < 0.01 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {a.difference >= 0 ? '+' : '−'}
                      {fmtMoney(a.difference)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${AUDIT_STATUS_COLOR[a.status]}`}
                      >
                        {AUDIT_STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setReporteZAuditId(a.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                      >
                        Ver Reporte Z
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
