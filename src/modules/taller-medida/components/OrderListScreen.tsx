import { useState, useEffect, useCallback } from 'react';
import { tallerMedidaApi } from '../api/tallerMedidaApi';
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from '../types';
import type { TallerOrder } from '../types';

type OrderWithTotals = TallerOrder & { paidAmount: number; pendingAmount: number };

interface Props {
  businessUnitId: number;
  onNewOrder: () => void;
  onSelectOrder: (id: number) => void;
}

function daysUntilDelivery(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DeliveryBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const days = daysUntilDelivery(date);
  if (days === null) return null;

  const label = days < 0
    ? `Vencido hace ${Math.abs(days)}d`
    : days === 0
      ? 'Entrega hoy'
      : `${days}d para entrega`;

  const color = days < 0
    ? 'bg-red-100 text-red-700'
    : days <= 3
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  presupuestado: 'bg-gray-100 text-gray-600',
  confirmado:    'bg-blue-100 text-blue-700',
  en_confeccion: 'bg-purple-100 text-purple-700',
  en_prueba:     'bg-orange-100 text-orange-700',
  listo:         'bg-green-100 text-green-700',
  entregado:     'bg-gray-100 text-gray-400',
  cancelado:     'bg-red-100 text-red-400',
};

export function OrderListScreen({ businessUnitId, onNewOrder, onSelectOrder }: Props) {
  const [orders, setOrders] = useState<OrderWithTotals[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tallerMedidaApi.listOrders(
        businessUnitId,
        statusFilter || undefined,
      );
      setOrders(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [businessUnitId, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const activeOrders = orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado');
  const alertOrders  = activeOrders.filter((o) => {
    const days = daysUntilDelivery(o.estimatedDelivery);
    return days !== null && days <= 3;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pedidos a medida</h2>
        <button
          onClick={onNewOrder}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuevo pedido
        </button>
      </div>

      {/* Alertas de vencimiento */}
      {alertOrders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-medium text-yellow-800">
            ⚠️ {alertOrders.length} pedido{alertOrders.length > 1 ? 's' : ''} próximo{alertOrders.length > 1 ? 's' : ''} a vencer:
          </p>
          <ul className="mt-1 space-y-0.5">
            {alertOrders.map((o) => (
              <li key={o.id} className="text-sm text-yellow-700">
                • <button
                    className="underline"
                    onClick={() => onSelectOrder(o.id)}
                  >
                    {o.customerName}
                  </button> — {o.description.slice(0, 40)}{o.description.length > 40 ? '…' : ''}
                  {' '}<DeliveryBadge date={o.estimatedDelivery} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtro por estado */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
            statusFilter === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos ({orders.length})
        </button>
        {ORDER_STATUSES.map((s) => {
          const count = orders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
                statusFilter === s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ORDER_STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading && <p className="text-gray-400 text-sm">Cargando pedidos...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay pedidos{statusFilter ? ` con estado "${ORDER_STATUS_LABELS[statusFilter]}"` : ''}.</p>
          <button
            onClick={onNewOrder}
            className="mt-3 text-blue-600 text-sm hover:underline"
          >
            Crear el primero
          </button>
        </div>
      )}

      <div className="space-y-2">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => onSelectOrder(order.id)}
            className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors border border-gray-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{order.customerName}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                  <DeliveryBadge date={order.estimatedDelivery} />
                </div>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{order.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-900">${order.totalAmount.toLocaleString('es-AR')}</p>
                {order.pendingAmount > 0 && (
                  <p className="text-xs text-orange-600">
                    Debe ${order.pendingAmount.toLocaleString('es-AR')}
                  </p>
                )}
                {order.pendingAmount === 0 && order.status !== 'cancelado' && (
                  <p className="text-xs text-green-600">Pagado</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              #{order.id} · {new Date(order.createdAt).toLocaleDateString('es-AR')}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
