import { formatTime as formatOpenedAt } from '@/lib/utils/dateFormat';
import type { DashboardDTO } from '@shared/types';

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface CajaActualProps {
  data: DashboardDTO['cajaActual'];
  isLoading?: boolean;
}

export function CajaActual({ data, isLoading }: CajaActualProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || !data.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-400">
        <span className="text-3xl">🏦</span>
        <p className="text-sm">No hay caja abierta</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <span className="font-medium text-green-700">
          Abierta · {formatOpenedAt(data.openedAt ?? '')}
        </span>
      </div>

      <Row label="Apertura" value={fmt(data.openingAmount)} />
      <Row label="Ventas del día" value={fmt(data.salesToday)} />
      <Row
        label="↳ Solo efectivo"
        value={fmt(data.cashSalesToday)}
        className="pl-4 text-xs text-gray-400"
        valueClassName="text-xs text-gray-400"
      />
      <Row label="+ Ingresos manuales" value={fmt(data.manualIncome)} />
      <Row label="− Egresos manuales" value={fmt(data.manualExpense)} />

      <div className="border-t pt-2 mt-1 flex items-center justify-between font-medium">
        <span className="text-gray-700">Efectivo estimado</span>
        <span className="text-blue-600">{fmt(data.estimatedCash)}</span>
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}

function Row({ label, value, className = '', valueClassName = '' }: RowProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-800 ${valueClassName}`}>{value}</span>
    </div>
  );
}
