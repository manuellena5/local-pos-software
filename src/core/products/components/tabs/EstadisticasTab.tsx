import { useEffect, useState } from 'react';
import type { ProductStats } from '@shared/types';
import { productsApi } from '@/lib/api/products';
import { formatCurrency } from '@/lib/utils/pricing';

interface EstadisticasTabProps {
  productId: number;
  businessUnitId: number;
  onOpenHistoryDrawer: () => void;
}

type Period = '30d' | '90d' | '1y';

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: '30d', label: '30 días', days: 30 },
  { id: '90d', label: '90 días', days: 90 },
  { id: '1y', label: '12 meses', days: 365 },
];

function MetricCard({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: number | null }) {
  const deltaColor = delta == null ? '' : delta >= 0 ? 'text-green-600' : 'text-red-500';
  return (
    <div className="border border-gray-100 rounded-xl p-3 flex flex-col gap-1">
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
      {delta != null && (
        <div className={`text-xs font-semibold ${deltaColor}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% vs período anterior
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.max(2, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 shrink-0">{value}</span>
    </div>
  );
}

export function EstadisticasTab({ productId, businessUnitId, onOpenHistoryDrawer }: EstadisticasTabProps) {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const days = PERIODS.find((p) => p.id === period)?.days ?? 30;
    productsApi.getStats(productId, businessUnitId, days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [productId, businessUnitId, period]);

  const s = data?.stats;
  const revenueGrowthPct = s && s.revenuePrev > 0
    ? ((s.revenue - s.revenuePrev) / s.revenuePrev) * 100
    : null;
  const unitsGrowthPct = s && s.unitsSoldPrev > 0
    ? ((s.unitsSold - s.unitsSoldPrev) / s.unitsSoldPrev) * 100
    : null;
  const maxUnits = data ? Math.max(...data.salesByMonth.map((m) => m.units), 1) : 1;

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              period === p.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Cargando estadísticas…</div>
      ) : !data || !s ? (
        <div className="text-center py-8 text-gray-400 text-sm">No hay datos disponibles</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MetricCard label="Unidades vendidas" value={String(s.unitsSold)} delta={unitsGrowthPct} />
            <MetricCard label="Ingresos" value={formatCurrency(s.revenue)} delta={revenueGrowthPct} />
            <MetricCard label="Ganancia neta" value={formatCurrency(s.netProfit)} delta={data.costGrowthPct} />
          </div>

          {data.salesByMonth.length > 0 && (
            <div className="border border-gray-100 rounded-xl p-3.5 mb-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Ventas por mes (unidades)</div>
              <div className="space-y-2">
                {data.salesByMonth.map((m) => (
                  <MiniBar key={m.month} label={m.month.slice(5)} value={m.units} max={maxUnits} />
                ))}
              </div>
            </div>
          )}

          {data.costHistory.length > 0 && (
            <div className="border border-gray-100 rounded-xl p-3.5 mb-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Historial de costo</div>
              <div className="space-y-1">
                {data.costHistory.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 text-xs">{c.date.slice(0, 10)}</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(c.unitCost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recentSales.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
              <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Últimas ventas</span>
                <button onClick={onOpenHistoryDrawer} className="text-xs text-blue-600 hover:underline">Ver todo →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {data.recentSales.slice(0, 5).map((sale, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2 text-sm">
                    <span className="text-gray-500 text-xs">{sale.date.slice(0, 10)}</span>
                    <span className="text-gray-700">{sale.quantity} u.</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(sale.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
