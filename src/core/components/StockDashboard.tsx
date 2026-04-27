import { useStock } from '@/core/hooks/useStock';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { useState } from 'react';

export function StockDashboard({ businessUnitId }: { businessUnitId: number }) {
  const { summary, loading, error, refetch } = useStock(businessUnitId);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  if (loading) return <p className="text-gray-400">Cargando stock...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const ok = summary.filter((s) => s.status === 'ok').length;
  const low = summary.filter((s) => s.status === 'low').length;
  const out = summary.filter((s) => s.status === 'out').length;

  return (
    <div className="space-y-4">
      {selectedProductId && (
        <StockAdjustmentModal
          productId={selectedProductId}
          businessUnitId={businessUnitId}
          onClose={() => setSelectedProductId(null)}
          onSuccess={() => {
            refetch();
            setSelectedProductId(null);
          }}
        />
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">OK</p>
          <p className="text-2xl font-bold text-green-700">{ok}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-600 font-medium">BAJO</p>
          <p className="text-2xl font-bold text-yellow-700">{low}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-600 font-medium">AGOTADO</p>
          <p className="text-2xl font-bold text-red-700">{out}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="text-left px-4 py-2">Producto</th>
            <th className="text-right px-4 py-2">Stock</th>
            <th className="text-center px-4 py-2">Umbral</th>
            <th className="text-center px-4 py-2">Estado</th>
            <th className="text-center px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {summary.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center px-4 py-4 text-gray-400">
                No hay stock
              </td>
            </tr>
          ) : (
            summary
              .slice()
              .sort((a, b) => {
                const order = { out: 0, low: 1, ok: 2 } as const;
                return order[a.status] - order[b.status];
              })
              .map((item) => (
                <tr key={item.productId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="text-right px-4 py-2 font-medium">{item.currentQuantity}</td>
                  <td className="text-center px-4 py-2 text-gray-600">{item.minimumThreshold}</td>
                  <td className="text-center px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'ok'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'low'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.status === 'ok' ? '✓ OK' : item.status === 'low' ? '⚠ Bajo' : '✕ Agotado'}
                    </span>
                  </td>
                  <td className="text-center px-4 py-2">
                    <button
                      onClick={() => setSelectedProductId(item.productId)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>
    </div>
  );
}
