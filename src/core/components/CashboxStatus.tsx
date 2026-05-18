import { useCashbox } from '@/core/hooks/useCashbox';

interface Props {
  businessUnitId: number | undefined;
  onGoToCashbox: () => void;
}

export function CashboxStatus({ businessUnitId, onGoToCashbox }: Props) {
  const { balance, audits, sessionStatus, loading } = useCashbox(businessUnitId);

  if (loading) return null;

  if (sessionStatus === 'never_opened' || sessionStatus === 'closed') {
    return (
      <button
        onClick={onGoToCashbox}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-gray-100 text-gray-500 hover:bg-gray-200"
        title="Abrir caja"
      >
        <span>🔒</span>
        <span>Sin caja abierta</span>
      </button>
    );
  }

  const lastAudit = audits[0] ?? null;
  const hasDiscrepancy = lastAudit?.status === 'discrepancy';

  return (
    <button
      onClick={onGoToCashbox}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        hasDiscrepancy
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      }`}
      title="Ver caja"
    >
      <span>{hasDiscrepancy ? '⚠️' : '🏦'}</span>
      <span>Caja: ${balance?.theoretical.toFixed(2) ?? '0.00'}</span>
      {hasDiscrepancy && <span className="text-orange-500">· Discrepancia</span>}
    </button>
  );
}
