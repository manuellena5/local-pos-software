import { useEffect } from 'react';
import { useTopProducts } from '@/core/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';

interface Props {
  businessUnitId: number;
}

export function TopProductsReport({ businessUnitId }: Props) {
  const { data, loading, error, load } = useTopProducts(businessUnitId, 10);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);

  function handleExport() {
    window.open(reportsApi.getExportURL(businessUnitId, 'top-products', { limit: 10 }), '_blank');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Top 10 productos más vendidos</p>
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
              <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Producto</th>
              <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Categoría</th>
              <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Cant. vendida</th>
              <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Ingresos</th>
              <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">% del total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.productId} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 px-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                <td className="py-2.5 px-3 font-medium text-gray-900">{r.name}</td>
                <td className="py-2.5 px-3 text-gray-500">{r.category ?? '—'}</td>
                <td className="py-2.5 px-3 text-right text-gray-700">{r.quantity}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900">${r.revenue.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {totalRevenue > 0 ? Math.round((r.revenue / totalRevenue) * 100) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
