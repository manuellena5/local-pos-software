import { useDashboard } from '@/core/hooks/useDashboard';
import type { DashboardData } from '@shared/types';

interface Props {
  businessUnitId: number;
  moduleId: string;
  onNavigate: (tab: string) => void;
}

export function DashboardPage({ businessUnitId, moduleId, onNavigate }: Props) {
  const { data, loading, error, refetch } = useDashboard(businessUnitId, moduleId);

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Cargando dashboard...</p>;
  if (error)   return <p className="text-red-500 text-sm py-8 text-center">{error}</p>;
  if (!data)   return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Resumen del día</h2>
        <button onClick={() => void refetch()} className="text-xs text-blue-600 hover:underline">
          Actualizar
        </button>
      </div>

      {/* Fila principal: Ventas + Caja */}
      <div className="grid grid-cols-2 gap-4">
        <SalesWidget data={data} />
        <CashboxWidget data={data} />
      </div>

      {/* Stock crítico */}
      <StockAlertWidget data={data} onNavigate={onNavigate} />

      {/* Widget condicional por módulo */}
      {data.upcomingOrders !== undefined && (
        <UpcomingOrdersWidget data={data} onNavigate={onNavigate} />
      )}
      {data.topProductsWeek !== undefined && (
        <TopProductsWidget data={data} />
      )}
    </div>
  );
}

function SalesWidget({ data }: { data: DashboardData }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
      <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-3">Ventas de hoy</p>
      <p className="text-3xl font-bold text-blue-700">
        ${data.salesToday.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </p>
      <p className="text-sm text-blue-500 mt-1">
        {data.salesToday.count} {data.salesToday.count === 1 ? 'transacción' : 'transacciones'}
      </p>
    </div>
  );
}

function CashboxWidget({ data }: { data: DashboardData }) {
  const { balance, lastAuditDate, lastAuditStatus } = data.cashbox;
  const today = new Date().toISOString().slice(0, 10);
  const isOpenToday = lastAuditDate === today;
  const hasDiscrepancy = lastAuditStatus === 'discrepancy';

  return (
    <div className={`border rounded-xl p-5 ${hasDiscrepancy ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-100'}`}>
      <p className="text-xs font-medium uppercase tracking-wide mb-3 text-gray-500">
        {hasDiscrepancy ? '⚠️ Caja — Discrepancia' : '🏦 Caja'}
      </p>
      <p className={`text-3xl font-bold ${hasDiscrepancy ? 'text-yellow-700' : 'text-green-700'}`}>
        ${balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </p>
      <p className={`text-sm mt-1 ${isOpenToday ? 'text-green-600' : 'text-gray-400'}`}>
        {isOpenToday ? 'Arqueo del día registrado' : 'Sin arqueo hoy'}
      </p>
    </div>
  );
}

function StockAlertWidget({ data, onNavigate }: { data: DashboardData; onNavigate: (tab: string) => void }) {
  const items = data.criticalStock;
  if (items.length === 0) {
    return (
      <div className="border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Stock crítico</p>
        <p className="text-sm text-gray-400">✓ Sin productos con stock bajo o agotado</p>
      </div>
    );
  }

  return (
    <div className="border border-red-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-red-500 uppercase tracking-wide">
          ⚠ Stock crítico ({items.length} producto{items.length !== 1 ? 's' : ''})
        </p>
        <button onClick={() => onNavigate('productos')} className="text-xs text-blue-600 hover:underline">
          Ver todo el stock →
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 truncate flex-1">{item.name}</span>
            <span className={`ml-3 px-2 py-0.5 rounded text-xs font-medium ${
              item.status === 'out' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {item.current} / {item.threshold}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingOrdersWidget({ data, onNavigate }: { data: DashboardData; onNavigate: (tab: string) => void }) {
  const orders = data.upcomingOrders ?? [];
  if (orders.length === 0) {
    return (
      <div className="border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Entregas próximas (7 días)</p>
        <p className="text-sm text-gray-400">✓ Sin entregas programadas esta semana</p>
      </div>
    );
  }

  return (
    <div className="border border-orange-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">
          🧵 Entregas próximas — {orders.length} pedido{orders.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => onNavigate('pedidos')} className="text-xs text-blue-600 hover:underline">
          Ver pedidos →
        </button>
      </div>
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-800">{o.customerName}</span>
              <span className="text-gray-400 ml-2 text-xs truncate">{o.description}</span>
            </div>
            <span className={`ml-3 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
              o.daysLeft < 0 ? 'bg-red-100 text-red-700' :
              o.daysLeft <= 1 ? 'bg-orange-100 text-orange-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {o.daysLeft < 0 ? `Vencido ${Math.abs(o.daysLeft)}d` :
               o.daysLeft === 0 ? 'Hoy' :
               `${o.daysLeft}d`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopProductsWidget({ data }: { data: DashboardData }) {
  const products = data.topProductsWeek ?? [];
  if (products.length === 0) {
    return (
      <div className="border border-gray-100 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">📦</span>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Más vendidos</p>
          <p className="text-sm text-gray-400">Las ventas de esta semana aparecerán acá</p>
        </div>
      </div>
    );
  }

  const maxQty = Math.max(...products.map((p) => p.quantity), 1);

  return (
    <div className="border border-purple-100 rounded-xl p-5">
      <p className="text-xs font-medium text-purple-500 uppercase tracking-wide mb-3">📦 Más vendidos esta semana</p>
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.productId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 truncate flex-1">{p.name}</span>
              <span className="text-gray-500 ml-2 text-xs">{p.quantity} uds · ${p.revenue.toFixed(0)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full"
                style={{ width: `${(p.quantity / maxQty) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
