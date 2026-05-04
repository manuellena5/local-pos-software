import { useEffect } from 'react';
import { useTopCustomers } from '@/core/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';

interface Props {
  businessUnitId: number;
}

export function TopCustomersReport({ businessUnitId }: Props) {
  const { data, loading, error, load } = useTopCustomers(businessUnitId, 10);

  useEffect(() => { load(); }, [load]);

  const maxSpent = data[0]?.totalSpent ?? 1;

  function handleExport() {
    window.open(reportsApi.getExportURL(businessUnitId, 'top-customers', { limit: 10 }), '_blank');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Top 10 clientes por monto comprado</p>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          ↓ Exportar CSV
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Cargando...</p>
      ) : error ? (
        <p className="text-center text-red-500 py-8 text-sm">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Sin ventas registradas</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">#</th>
              <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Cliente</th>
              <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Compras</th>
              <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Total gastado</th>
              <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Ticket prom.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 px-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${(r.totalSpent / maxSpent) * 100}%` }}
                      />
                    </div>
                    <span className={`font-medium ${r.customerId ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {r.name}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-gray-700">{r.purchaseCount}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900">${r.totalSpent.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-gray-500">
                  ${r.purchaseCount > 0 ? (r.totalSpent / r.purchaseCount).toFixed(2) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
