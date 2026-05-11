import { useState, useEffect, useCallback } from 'react';
import { tallerMedidaApi } from '../api/tallerMedidaApi';
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus, type TallerOrder } from '../types';

type OrderWithTotals = TallerOrder & { paidAmount: number; pendingAmount: number };

interface Props {
  businessUnitId: number;
}

export function OrderReportScreen({ businessUnitId }: Props) {
  const [orders, setOrders]     = useState<OrderWithTotals[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tallerMedidaApi.listOrders(businessUnitId);
      setOrders(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => { void load(); }, [load]);

  const filtered = orders.filter((o) => {
    const date = o.createdAt.slice(0, 10);
    if (fromDate && date < fromDate) return false;
    if (toDate   && date > toDate)   return false;
    return true;
  });

  const byStatus = ORDER_STATUSES.map((s) => ({
    status: s,
    orders: filtered.filter((o) => o.status === s),
  })).filter((g) => g.orders.length > 0);

  const totalRevenue   = filtered.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCollected = filtered.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPending   = filtered.reduce((sum, o) => sum + o.pendingAmount, 0);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Reporte de pedidos</h2>

      {/* Filtro por fecha */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 pb-2"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 font-medium">Pedidos</p>
          <p className="text-2xl font-bold text-blue-700">{filtered.length}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 font-medium">Total facturado</p>
          <p className="text-lg font-bold text-gray-700">${totalRevenue.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600 font-medium">Cobrado</p>
          <p className="text-lg font-bold text-green-700">${totalCollected.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-xs text-orange-600 font-medium">Pendiente</p>
          <p className="text-lg font-bold text-orange-700">${totalPending.toLocaleString('es-AR')}</p>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}
      {error   && <p className="text-red-500 text-sm">{error}</p>}

      {/* Tabla por estado */}
      {byStatus.map(({ status, orders: group }) => (
        <div key={status}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {ORDER_STATUS_LABELS[status as OrderStatus]}
            <span className="ml-2 text-gray-400 font-normal">({group.length})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Descripción</th>
                  <th className="pb-2 font-medium">Entrega</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium text-right">Cobrado</th>
                  <th className="pb-2 font-medium text-right">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-400">{o.id}</td>
                    <td className="py-2 font-medium text-gray-900">{o.customerName}</td>
                    <td className="py-2 text-gray-500 max-w-xs truncate">{o.description}</td>
                    <td className="py-2 text-gray-500">
                      {o.estimatedDelivery
                        ? new Date(o.estimatedDelivery + 'T12:00:00').toLocaleDateString('es-AR')
                        : '—'}
                    </td>
                    <td className="py-2 text-right font-medium">${o.totalAmount.toLocaleString('es-AR')}</td>
                    <td className="py-2 text-right text-green-700">${o.paidAmount.toLocaleString('es-AR')}</td>
                    <td className={`py-2 text-right ${o.pendingAmount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      ${o.pendingAmount.toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!loading && filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No hay pedidos en el período seleccionado.</p>
      )}
    </div>
  );
}
