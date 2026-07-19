import { useState } from 'react';
import { useCashbox } from '@/core/hooks/useCashbox';
import { cashboxApi } from '@/lib/api/cashbox';
import { formatDate as fmtDate, formatTime as fmtTime } from '@/lib/utils/dateFormat';
import { CashAuditForm } from './CashAuditForm';
import { ReporteZModal } from './ReporteZModal';
import { CashSessionMovementsTable } from './CashSessionMovementsTable';
import type { CashAudit, CashMovementType, CashPaymentMethodType } from '@shared/types';
import type { AuditWithTimes } from '@/lib/api/cashbox';

interface Props {
  businessUnitId: number;
  onNavigateToSale?: (saleId: number) => void;
}

function fmtMoney(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

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
  const [paymentMethod, setPaymentMethod] = useState<CashPaymentMethodType>('cash');
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
      await cashboxApi.recordMovement(businessUnitId, {
        type,
        amount: amountNum,
        description,
        paymentMethod,
      });
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
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
        <input
          type="text"
          placeholder="Motivo del movimiento"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Medio de pago</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as CashPaymentMethodType)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="card">Tarjeta</option>
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
  cashTheoretical,
  otherByMethod,
  onDone,
  onClose,
}: {
  businessUnitId: number;
  cashTheoretical: number;
  otherByMethod: { transfer: number; mercadopago: number; card: number; other: number };
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
          cashTheoretical={cashTheoretical}
          otherByMethod={otherByMethod}
          onAuditDone={onDone}
        />
      </div>
    </div>
  );
}

export function CashboxPage({ businessUnitId, onNavigateToSale }: Props) {
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
  const sessionBalance = sessionData?.sessionBalance;
  const byMethod = sessionBalance?.byMethod ?? {
    cash: 0, transfer: 0, mercadopago: 0, card: 0, other: 0,
  };
  const openingMovement = sessionData?.openingMovement ?? null;

  const openingAmt = movements.find((m) => m.type === 'opening')?.amount ?? 0;

  // Desglose cash-only para Sección A
  const cashSalesAmt = movements
    .filter((m) => m.type === 'sale' && m.paymentMethod === 'cash')
    .reduce((s, m) => s + m.amount, 0);
  const cashEgressAmt = movements
    .filter((m) => m.type === 'withdrawal' && m.paymentMethod === 'cash')
    .reduce((s, m) => s + m.amount, 0);
  const cashVoidsAmt = movements
    .filter((m) => m.type === 'refund' && m.paymentMethod === 'cash')
    .reduce((s, m) => s + m.amount, 0);

  // Agregados de la sesión (de sessionBalance)
  const totalSales = sessionBalance?.totalSales ?? 0;
  const totalVoids = sessionBalance?.totalVoids ?? 0;
  const totalManualOut = sessionBalance?.totalManualOut ?? 0;
  const totalManualIn = sessionBalance?.totalManualIn ?? 0;

  const cashAmt = sessionBalance?.cashBalance ?? byMethod.cash;
  const cashIsNegative = cashAmt < 0;

  const hasDigital =
    byMethod.transfer !== 0 ||
    byMethod.mercadopago !== 0 ||
    byMethod.card !== 0 ||
    byMethod.other !== 0;

  return (
    <>
      {showAuditModal && (
        <AuditModal
          businessUnitId={businessUnitId}
          cashTheoretical={sessionBalance?.cashBalance ?? 0}
          otherByMethod={{
            transfer: byMethod.transfer,
            mercadopago: byMethod.mercadopago,
            card: byMethod.card,
            other: byMethod.other,
          }}
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
            {openingMovement?.code && (
              <p className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                Sesión: {openingMovement.code}
              </p>
            )}
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

          {/* Sección A: EFECTIVO EN CAJA */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Efectivo en caja
            </p>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-bold ${cashIsNegative ? 'text-red-600' : 'text-gray-900'}`}
              >
                {cashIsNegative ? '−' : ''}${Math.abs(cashAmt).toFixed(2)}
              </span>
            </div>
            {cashIsNegative && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 leading-snug">
                ⚠ Egresos superan el efectivo disponible
              </p>
            )}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Apertura:</span>
                <span className="text-xs text-gray-600">+${openingAmt.toFixed(2)}</span>
              </div>
              {cashSalesAmt > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Ventas ef.:</span>
                  <span className="text-xs text-gray-600">+${cashSalesAmt.toFixed(2)}</span>
                </div>
              )}
              {cashEgressAmt > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Egresos ef.:</span>
                  <span className="text-xs text-red-500">−${cashEgressAmt.toFixed(2)}</span>
                </div>
              )}
              {cashVoidsAmt > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Anulaciones:</span>
                  <span className="text-xs text-red-500">−${cashVoidsAmt.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sección B: PARA VERIFICAR (solo si hay métodos digitales != 0) */}
          {hasDigital && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Para verificar
              </p>
              <div className="space-y-1">
                {byMethod.transfer !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Transferencias:</span>
                    <span className={`text-xs font-medium ${byMethod.transfer < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {byMethod.transfer < 0 ? '−' : ''}${Math.abs(byMethod.transfer).toFixed(2)}
                    </span>
                  </div>
                )}
                {byMethod.mercadopago !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Mercado Pago:</span>
                    <span className={`text-xs font-medium ${byMethod.mercadopago < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {byMethod.mercadopago < 0 ? '−' : ''}${Math.abs(byMethod.mercadopago).toFixed(2)}
                    </span>
                  </div>
                )}
                {byMethod.card !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Tarjeta:</span>
                    <span className={`text-xs font-medium ${byMethod.card < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {byMethod.card < 0 ? '−' : ''}${Math.abs(byMethod.card).toFixed(2)}
                    </span>
                  </div>
                )}
                {byMethod.other !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Otro:</span>
                    <span className={`text-xs font-medium ${byMethod.other < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {byMethod.other < 0 ? '−' : ''}${Math.abs(byMethod.other).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                Verificar contra banco / app al cerrar
              </p>
            </div>
          )}

          {/* Sección C: OPERADO HOY */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Operado hoy
            </p>
            {totalSales === 0 && totalVoids === 0 && totalManualOut === 0 && totalManualIn === 0 ? (
              <p className="text-xs text-gray-400">Sin operaciones</p>
            ) : (
              <div className="space-y-1">
                {totalSales > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Ventas:</span>
                    <span className="text-xs font-medium text-green-700">+${totalSales.toFixed(2)}</span>
                  </div>
                )}
                {totalVoids > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Anulaciones:</span>
                    <span className="text-xs font-medium text-red-600">−${totalVoids.toFixed(2)}</span>
                  </div>
                )}
                {totalManualOut > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Egresos:</span>
                    <span className="text-xs font-medium text-red-600">−${totalManualOut.toFixed(2)}</span>
                  </div>
                )}
                {totalManualIn > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Ingresos man.:</span>
                    <span className="text-xs font-medium text-green-700">+${totalManualIn.toFixed(2)}</span>
                  </div>
                )}
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
            <CashSessionMovementsTable
              movements={movements}
              businessUnitId={businessUnitId}
              cashSessionId={openingMovement?.id ?? null}
              onNavigateToSale={onNavigateToSale}
            />
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
                    Sesión
                  </th>
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
                    Efectivo teórico
                  </th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2.5 px-4">
                    Efectivo contado
                  </th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2.5 px-4">
                    Diferencia
                  </th>
                  <th className="text-right text-xs text-gray-500 font-medium py-2.5 px-4">
                    Otros medios
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
                    <td className="py-2.5 px-4 font-mono text-xs text-blue-700">
                      {a.code ?? '—'}
                    </td>
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
                    <td className="py-2.5 px-4 text-right text-gray-500 text-xs">
                      {a.otherMethodsTotal > 0 ? fmtMoney(a.otherMethodsTotal) : '—'}
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
