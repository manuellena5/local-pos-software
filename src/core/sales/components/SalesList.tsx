import type { Sale } from '@shared/types';
import type { UseSalesFilters } from '../hooks/useSales';

interface Props {
  sales: Sale[];
  loading: boolean;
  filters: UseSalesFilters;
  onFiltersChange: (filters: UseSalesFilters) => void;
  selectedId: number | null;
  onSelect: (sale: Sale) => void;
}

const PAYMENT_BADGE: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  transfer: 'bg-blue-100 text-blue-700',
  card: 'bg-purple-100 text-purple-700',
  mercadopago: 'bg-sky-100 text-sky-700',
  modo: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-600',
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transfer.',
  card: 'Tarjeta',
  mercadopago: 'MP',
  modo: 'Modo',
  other: 'Otro',
};

function paymentBadge(method: string): string {
  return PAYMENT_BADGE[method.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}
function paymentLabel(method: string): string {
  return PAYMENT_LABEL[method.toLowerCase()] ?? method;
}

function fmtDateTime(dt: string): string {
  const [date, time] = dt.split(' ');
  if (!date) return dt;
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time?.slice(0, 5) ?? ''}`;
}

const DATE_PRESETS = [
  { label: 'Hoy', days: 0 },
  { label: 'Ayer', days: 1 },
  { label: '7 días', days: 7 },
  { label: 'Este mes', days: 30 },
] as const;

function presetDateFrom(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function SalesList({ sales, loading, filters, onFiltersChange, selectedId, onSelect }: Props) {
  const completed = sales.filter((s) => s.status === 'completed');
  const cancelled = sales.filter((s) => s.status === 'cancelled');
  const total = completed.reduce((s, v) => s + v.totalAmount, 0);

  function updateFilter<K extends keyof UseSalesFilters>(key: K, value: UseSalesFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function applyPreset(days: number) {
    const today = new Date().toISOString().slice(0, 10);
    onFiltersChange({
      ...filters,
      dateFrom: presetDateFrom(days),
      dateTo: today,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filtros */}
      <div className="space-y-2 pb-3 border-b border-gray-100">
        {/* Presets de fecha */}
        <div className="flex gap-1">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="px-2.5 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Rango personalizado */}
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Búsqueda + filtros */}
        <input
          type="text"
          placeholder="Buscar por N°, cliente o producto..."
          value={filters.search ?? ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <div className="flex gap-2">
          <select
            value={filters.status ?? 'all'}
            onChange={(e) => updateFilter('status', e.target.value as UseSalesFilters['status'])}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">Todos los estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
          <select
            value={filters.paymentMethod ?? ''}
            onChange={(e) => updateFilter('paymentMethod', e.target.value || undefined)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">Todos los medios</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="modo">Modo/Ualá</option>
          </select>
        </div>

        {/* Métricas rápidas */}
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-500">Total período</p>
            <p className="text-sm font-bold text-blue-700">${total.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">Ventas</p>
            <p className="text-sm font-bold text-gray-700">{completed.length}</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-lg px-3 py-2">
            <p className="text-xs text-red-500">Anuladas</p>
            <p className="text-sm font-bold text-red-600">{cancelled.length}</p>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto mt-2">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-8">Cargando ventas...</p>
        ) : sales.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            No hay ventas en el período seleccionado.
          </p>
        ) : (
          <div className="space-y-1">
            {sales.map((sale) => {
              const isSelected = sale.id === selectedId;
              const isCancelled = sale.status === 'cancelled';
              const primaryPayment = sale.paymentMethods[0];

              return (
                <button
                  key={sale.id}
                  onClick={() => onSelect(sale)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors border ${
                    isSelected
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          #{sale.saleNumber}
                        </span>
                        {isCancelled && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                            Anulada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(sale.createdAt)}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {sale.customerId ? `Cliente #${sale.customerId}` : 'Consumidor final'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-sm font-bold ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                        ${sale.totalAmount.toFixed(2)}
                      </p>
                      {primaryPayment && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${paymentBadge(primaryPayment.method)}`}
                        >
                          {paymentLabel(primaryPayment.method)}
                          {sale.paymentMethods.length > 1 && ` +${sale.paymentMethods.length - 1}`}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
