import { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useProductsStore } from '../store/productsStore';
import { ProductsTable } from './ProductsTable';
import { ProductsSummaryChips } from './ProductsSummaryChips';
import { ColumnSelector } from './ColumnSelector';
import { ProductEditModal } from './ProductEditModal';
import { ProductHistoryDrawer } from './ProductHistoryDrawer';
import { StockMovementModal } from './StockMovementModal';
import { BulkPriceUpdateModal } from './BulkPriceUpdateModal';

interface ProductsPageProps {
  businessUnitId: number;
}

interface Toast {
  id: number;
  msg: string;
  type: 'ok' | 'error';
}

let toastId = 0;

export function ProductsPage({ businessUnitId }: ProductsPageProps) {
  const { products, loading, error, refetch, chipCounts, categories } = useProducts(businessUnitId);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const search       = useProductsStore((s) => s.filter.search);
  const category     = useProductsStore((s) => s.filter.category);
  const stockFilter  = useProductsStore((s) => s.filter.stockFilter);
  const showArchived = useProductsStore((s) => s.filter.showArchived);
  const setSearch       = useProductsStore((s) => s.setSearch);
  const setCategory     = useProductsStore((s) => s.setCategory);
  const setStockFilter  = useProductsStore((s) => s.setStockFilter);
  const setShowArchived = useProductsStore((s) => s.setShowArchived);
  const openBulkModal   = useProductsStore((s) => s.openBulkModal);
  const openEditModal   = useProductsStore((s) => s.openEditModal);

  const addToast = (msg: string, type: 'ok' | 'error' = 'ok') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Page header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-tight">Productos</h1>
          <p className="text-[10px] text-gray-400">
            {loading ? 'Cargando…' : `${products.length} producto${products.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={openBulkModal}
            className="px-2.5 py-1 border border-gray-200 rounded text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50"
          >
            ⚡ Precios masivos
          </button>
          <button
            className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
            onClick={() => openEditModal(null)}
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="px-3 pt-2 shrink-0">
        <ProductsSummaryChips counts={chipCounts} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 pb-2 shrink-0 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Buscar nombre, SKU, código de barras..."
            className="pl-7 pr-2 py-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <select
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-500 min-w-[120px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Stock filter */}
        <select
          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-500"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as 'all' | 'instock' | 'low' | 'out')}
        >
          <option value="all">Todo el stock</option>
          <option value="instock">Con stock</option>
          <option value="low">Stock bajo</option>
          <option value="out">Sin stock</option>
        </select>

        {/* Archived toggle */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
            showArchived
              ? 'bg-amber-100 text-amber-700 border-amber-300'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          🗄️ Archivados
        </button>

        {/* Column selector */}
        <ColumnSelector />
      </div>

      {/* Table area — zero horizontal padding so la tabla usa todo el ancho */}
      <div className="flex-1 overflow-y-auto px-0 pb-3">
        {error ? (
          <div className="text-center py-10 text-red-500 text-sm px-3">
            {error}
            <button onClick={refetch} className="block mx-auto mt-2 text-xs text-blue-600 hover:underline">Reintentar</button>
          </div>
        ) : loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Cargando productos…</div>
        ) : (
          <ProductsTable
            products={products}
            businessUnitId={businessUnitId}
            onRefetch={refetch}
            onToast={addToast}
          />
        )}
      </div>

      {/* Modals & Drawer */}
      <ProductEditModal businessUnitId={businessUnitId} onRefetch={refetch} onToast={addToast} />
      <ProductHistoryDrawer businessUnitId={businessUnitId} />
      <StockMovementModal businessUnitId={businessUnitId} onRefetch={refetch} onToast={addToast} />
      <BulkPriceUpdateModal businessUnitId={businessUnitId} onRefetch={refetch} onToast={addToast} />

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-1.5 z-[100] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-lg shadow-lg text-xs font-semibold pointer-events-auto ${
              t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
