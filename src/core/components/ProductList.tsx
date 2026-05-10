import { useState } from 'react';
import { useProducts } from '@/core/hooks/useProducts';
import { useStockData } from '@/core/hooks/useStockData';
import { getDisplayPrice, formatCurrency } from '@/lib/utils/pricing';
import { ProductForm } from './ProductForm';
import type { Product } from '@shared/types';

export function ProductList({ businessUnitId }: { businessUnitId: number }) {
  const [search, setSearch]                         = useState('');
  const [showCreate, setShowCreate]                 = useState(false);
  const [editProduct, setEditProduct]               = useState<Product | null>(null);
  const { products, loading, error, refetch }       = useProducts(businessUnitId, search);
  const { stockData }                               = useStockData(businessUnitId);

  if (loading) return <p className="text-gray-400">Cargando productos...</p>;
  if (error)   return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
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
          {products.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center px-4 py-4 text-gray-400">
                No hay productos
              </td>
            </tr>
          ) : (
            products.map((p) => (
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
                  <button
                    onClick={() => setEditProduct(p)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Editar
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
