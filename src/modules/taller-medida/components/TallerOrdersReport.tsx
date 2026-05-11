import { useState, useEffect } from 'react';
import { reportsApi } from '@/lib/api/reports';
import { useAppStore } from '@/core/store/appStore';
import { ORDER_STATUS_LABELS } from '../types';
import * as XLSX from 'xlsx';

interface OrderRow {
  id: number;
  customerName: string;
  description: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  estimatedDelivery: string | null;
  createdAt: string;
}

interface StatusSummary {
  status: string;
  count: number;
  totalAmount: number;
}

export function TallerOrdersReport() {
  const activeBU = useAppStore((s) => s.activeBU);
  const [byStatus, setByStatus] = useState<StatusSummary[]>([]);
  const [orders, setOrders]     = useState<OrderRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<string>('all');

  useEffect(() => {
    if (!activeBU) return;
    setLoading(true);
    reportsApi.getTallerOrdersReport(activeBU.id)
      .then((data) => {
        setByStatus(data.byStatus as StatusSummary[]);
        setOrders(data.orders as OrderRow[]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeBU]);

  function handleExportExcel() {
    const rows = filteredOrders.map((o) => ({
      ID: o.id,
      Cliente: o.customerName,
      Descripción: o.description,
      Estado: ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status,
      Total: o.totalAmount,
      Pagado: o.paidAmount,
      Pendiente: o.pendingAmount,
      'Entrega estimada': o.estimatedDelivery ?? '',
      'Fecha creación': o.createdAt.slice(0, 10),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, 'pedidos-taller.xlsx');
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Cargando reporte...</p>;
  if (error)   return <p className="text-red-500 text-sm py-8 text-center">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Resumen por estado */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {byStatus.map((s) => (
          <button
            key={s.status}
            onClick={() => setFilter(filter === s.status ? 'all' : s.status)}
            className={`rounded-lg p-2 text-center border text-xs transition-all ${
              filter === s.status ? 'ring-2 ring-blue-400 border-blue-200' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-semibold text-gray-800 text-base">{s.count}</p>
            <p className="text-gray-500 truncate">{ORDER_STATUS_LABELS[s.status as keyof typeof ORDER_STATUS_LABELS] ?? s.status}</p>
            <p className="text-gray-400 text-xs">${s.totalAmount.toFixed(0)}</p>
          </button>
        ))}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="ml-2 text-blue-600 hover:underline text-xs">
              Ver todos
            </button>
          )}
        </p>
        <button
          onClick={handleExportExcel}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          ↓ Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      {filteredOrders.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Sin pedidos</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">#</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Cliente</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Descripción</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Estado</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Total</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Pagado</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Pendiente</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-400 text-xs">{o.id}</td>
                  <td className="py-2 px-3 font-medium text-gray-900">{o.customerName}</td>
                  <td className="py-2 px-3 text-gray-500 max-w-xs truncate">{o.description}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                      {ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold">${o.totalAmount.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-green-700">${o.paidAmount.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right ${o.pendingAmount > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    ${o.pendingAmount.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs">
                    {o.estimatedDelivery
                      ? new Date(o.estimatedDelivery + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
