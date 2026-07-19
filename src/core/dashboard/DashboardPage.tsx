import { useDashboard } from '@/core/hooks/useDashboard';
import { formatTime } from '@/lib/utils/dateFormat';
import { KpiCard } from './components/KpiCard';
import { SalesChart } from './components/SalesChart';
import { PaymentMethods } from './components/PaymentMethods';
import { CajaActual } from './components/CajaActual';
import { LowStock } from './components/LowStock';

interface Props {
  businessUnitId: number;
  moduleId: string;
  onNavigate: (tab: string) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  other: 'Otro',
};

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function DashboardPage({ onNavigate }: Props) {
  const { data, isLoading, error, refetch } = useDashboard();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
        <button
          onClick={() => void refetch()}
          className="text-xs text-blue-600 hover:underline"
        >
          Actualizar
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => void refetch()}
            className="ml-4 text-xs text-red-600 underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* KPI row — 4 columns */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Ventas hoy"
          value={isLoading ? '—' : formatCurrency(data?.kpis.salesToday ?? 0)}
          delta={data?.kpis.salesTodayDelta}
          sub="vs ayer"
          isLoading={isLoading}
        />
        <KpiCard
          label="Transacciones"
          value={isLoading ? '—' : String(data?.kpis.transactionsToday ?? 0)}
          isLoading={isLoading}
        />
        <KpiCard
          label="Ticket promedio"
          value={isLoading ? '—' : formatCurrency(data?.kpis.avgTicketToday ?? 0)}
          isLoading={isLoading}
        />
        <KpiCard
          label="Esta semana"
          value={isLoading ? '—' : formatCurrency(data?.kpis.salesWeek ?? 0)}
          sub={isLoading ? undefined : `${data?.kpis.transactionsWeek ?? 0} ventas · 7d`}
          variant="info"
          isLoading={isLoading}
        />
      </div>

      {/* Chart + Payment methods — 3 columns */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Ventas — últimos 7 días
          </p>
          <SalesChart data={data?.last7Days ?? []} isLoading={isLoading} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Medios de pago
          </p>
          <PaymentMethods data={data?.paymentMethods ?? []} isLoading={isLoading} />
        </div>
      </div>

      {/* Caja + Low stock — 2 columns */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Caja actual
          </p>
          <CajaActual data={data?.cajaActual ?? null} isLoading={isLoading} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Stock bajo ({isLoading ? '…' : (data?.lowStock.length ?? 0)})
          </p>
          <LowStock
            data={data?.lowStock ?? []}
            isLoading={isLoading}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* Últimas ventas + Top productos — 2 columns */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Últimas ventas
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (data?.recentSales.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">Sin ventas registradas</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(data?.recentSales ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-800">{formatCurrency(s.total)}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                    </span>
                    {s.customerName && (
                      <span className="ml-2 text-xs text-gray-500 truncate">· {s.customerName}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 ml-2">
                    {formatTime(s.createdAt)} · {s.itemsCount} ítem{s.itemsCount !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Más vendidos del mes
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (data?.topProducts.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">Sin ventas este mes</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(data?.topProducts ?? []).map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <span className="font-medium text-gray-800 truncate">{p.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{p.sku}</span>
                  </div>
                  <div className="text-xs text-gray-600 shrink-0 ml-2 text-right">
                    <span className="font-semibold">{p.totalUnits} u.</span>
                    <span className="ml-1 text-gray-400">{formatCurrency(p.totalRevenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
