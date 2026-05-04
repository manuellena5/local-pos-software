import { useState } from 'react';
import { useCashbox } from '@/core/hooks/useCashbox';
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

export function CashboxPage({ businessUnitId }: Props) {
  const [tab, setTab] = useState<CashTab>('movements');
  const { balance, audits, loading, refetch } = useCashbox(businessUnitId);

  const today = new Date().toISOString().slice(0, 10);
  const lastAudit = audits[0] ?? null;

  function handleAuditDone() {
    refetch();
    setTab('history');
  }

  return (
    <div className="space-y-4">
      {/* Balance del día */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">Balance teórico</p>
          <p className="text-3xl font-bold text-emerald-700">
            {loading ? '...' : `$${balance?.theoretical.toFixed(2) ?? '0.00'}`}
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
