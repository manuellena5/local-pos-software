import { useStock } from '@/core/hooks/useStock';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { useState, useMemo } from 'react';

type StatusFilter = 'all' | 'ok' | 'low' | 'out';

export function StockDashboard({ businessUnitId }: { businessUnitId: number }) {
  const { summary, loading, error, refetch } = useStock(businessUnitId);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [search, setSearch]                       = useState('');
  const [statusFilter, setStatusFilter]           = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return summary
      .filter((s) => {
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const order: Record<string, number> = { out: 0, low: 1, ok: 2 };
        return (order[a.status] ?? 0) - (order[b.status] ?? 0);
      });
  }, [summary, search, statusFilter]);

  const ok  = summary.filter((s) => s.status === 'ok').length;
  const low = summary.filter((s) => s.status === 'low').length;
  const out = summary.filter((s) => s.status === 'out').length;

  if (loading) return <p className="text-gray-400">Cargando stock...</p>;
  if (error)   return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-4">
      {selectedProductId !== null && (
        <StockAdjustmentModal
          productId={selectedProductId}
          businessUnitId={businessUnitId}
          onClose={() => setSelectedProductId(null)}
          onSuccess={() => { void refetch(); setSelectedProductId(null); }}
        />
      )}

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')}
          className={`rounded-lg p-3 text-left border transition-all ${statusFilter === 'ok' ? 'ring-2 ring-green-400' : ''} bg-green-50 border-green-200`}
        >
          <p className="text-xs text-green-600 font-medium">OK</p>
          <p className="text-2xl font-bold text-green-700">{ok}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
          className={`rounded-lg p-3 text-left border transition-all ${statusFilter === 'low' ? 'ring-2 ring-yellow-400' : ''} bg-yellow-50 border-yellow-200`}
        >
          <p className="text-xs text-yellow-600 font-medium">BAJO</p>
          <p className="text-2xl font-bold text-yellow-700">{low}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'out' ? 'all' : 'out')}
          className={`rounded-lg p-3 text-left border transition-all ${statusFilter === 'out' ? 'ring-2 ring-red-400' : ''} bg-red-50 border-red-200`}
        >
          <p className="text-xs text-red-600 font-medium">AGOTADO</p>
          <p className="text-2xl font-bold text-red-700">{out}</p>
        </button>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre o SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
      />

      {/* Tabla */}
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="text-left px-4 py-2">Producto</th>
            <th className="text-left px-4 py-2 text-gray-500">SKU</th>
            <th className="text-right px-4 py-2">Stock</th>
            <th className="text-center px-4 py-2">Umbral</th>
            <th className="text-center px-4 py-2">Estado</th>
            <th className="text-center px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center px-4 py-6 text-gray-400">
                {search || statusFilter !== 'all' ? 'Sin resultados para el filtro aplicado' : 'No hay productos'}
              </td>
            </tr>
          ) : (
            filtered.map((item) => (
              <tr key={item.productId} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{item.name}</td>
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">{item.sku}</td>
                <td className="text-right px-4 py-2 font-bold">{item.currentQuantity}</td>
                <td className="text-center px-4 py-2 text-gray-500">{item.minimumThreshold}</td>
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
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                  >
                    Ajustar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="text-xs text-gray-400 text-right">
        {filtered.length} de {summary.length} productos
        {statusFilter !== 'all' && <> · <button className="underline" onClick={() => setStatusFilter('all')}>Ver todos</button></>}
      </p>
    </div>
  );
}
