import { useState, useMemo } from 'react';
import { useProducts } from '@/core/hooks/useProducts';
import { useStockData } from '@/core/hooks/useStockData';
import { getDisplayPrice, formatCurrency } from '@/lib/utils/pricing';
import { ProductForm } from './ProductForm';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import type { Product } from '@shared/types';

export function ProductList({ businessUnitId }: { businessUnitId: number }) {
  const [search, setSearch]                         = useState('');
  const [categoryFilter, setCategoryFilter]         = useState('');
  const [showCreate, setShowCreate]                 = useState(false);
  const [editProduct, setEditProduct]               = useState<Product | null>(null);
  const [adjustStockProductId, setAdjustStockProductId] = useState<number | null>(null);
  const { products, loading, error, refetch }       = useProducts(businessUnitId, search);
  const { stockData }                               = useStockData(businessUnitId);

  // Categorías únicas derivadas de los productos cargados (client-side, sin llamada extra)
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))].sort(),
    [products],
  );

  // Filtro por categoría aplicado sobre los productos ya filtrados por búsqueda en servidor
  const filtered = useMemo(
    () => (!categoryFilter ? products : products.filter((p) => p.category === categoryFilter)),
    [products, categoryFilter],
  );

  if (loading) return <p className="text-gray-400">Cargando productos...</p>;
  if (error)   return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nuevo
        </button>
      </div>

      {/* Modal crear */}
      {showCreate && (
        <ProductForm
          businessUnitId={businessUnitId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { refetch(); setShowCreate(false); }}
        />
      )}

      {/* Modal editar */}
      {editProduct && (
        <ProductForm
          businessUnitId={businessUnitId}
          existingProduct={editProduct}
          onClose={() => setEditProduct(null)}
          onSuccess={() => { refetch(); setEditProduct(null); }}
        />
      )}

      {/* Modal ajuste de stock */}
      {adjustStockProductId !== null && (
        <StockAdjustmentModal
          productId={adjustStockProductId}
          businessUnitId={businessUnitId}
          onClose={() => setAdjustStockProductId(null)}
          onSuccess={() => { refetch(); setAdjustStockProductId(null); }}
        />
      )}

      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="text-left px-4 py-2">Producto</th>
            <th className="text-left px-4 py-2">SKU</th>
            <th className="text-left px-4 py-2">Categoría</th>
            <th className="text-right px-4 py-2">Precio</th>
            <th className="text-right px-4 py-2">Costo</th>
            <th className="text-center px-4 py-2">Stock</th>
            <th className="text-center px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center px-4 py-4 text-gray-400">
                {search || categoryFilter ? 'Sin resultados para el filtro aplicado' : 'No hay productos'}
              </td>
            </tr>
          ) : (
            filtered.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2 text-gray-500">{p.category ?? '-'}</td>
                <td className="text-right px-4 py-2">{formatCurrency(getDisplayPrice(p.basePrice, p.taxRate))}</td>
                <td className="text-right px-4 py-2 text-gray-500">{formatCurrency(p.costPrice)}</td>
                <td className="text-center px-4 py-2">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {stockData[p.id]?.currentQuantity ?? '-'}
                  </span>
                </td>
                <td className="text-center px-4 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditProduct(p)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Editar
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setAdjustStockProductId(p.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      Stock
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {categoryFilter && (
        <p className="text-xs text-gray-400 text-right">
          {filtered.length} de {products.length} productos ·{' '}
          <button className="underline" onClick={() => setCategoryFilter('')}>Ver todos</button>
        </p>
      )}
    </div>
  );
}
