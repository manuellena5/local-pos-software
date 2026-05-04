import { useState, useEffect } from 'react';
import { reportsApi } from '@/lib/api/reports';
import type { StockMovement } from '@shared/types';

interface Props {
  businessUnitId: number;
}

const TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  sale: 'Venta',
  adjustment: 'Ajuste',
};

const TYPE_COLORS: Record<string, string> = {
  entry: 'bg-green-100 text-green-700',
  sale: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-yellow-100 text-yellow-700',
};

export function StockMovementReport({ businessUnitId }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getStockMovements(businessUnitId, { fromDate, toDate });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [businessUnitId, fromDate, toDate]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">Desde:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">Hasta:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{data.length} movimientos</span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Cargando...</p>
      ) : error ? (
        <p className="text-center text-red-500 py-8 text-sm">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Sin movimientos en el período</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Fecha</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Tipo</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Cantidad</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-400 text-xs font-mono">
                    {new Date(m.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[m.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className={`py-2 px-3 text-right font-medium ${m.quantity > 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
