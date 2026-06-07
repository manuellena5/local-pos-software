import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { getDisplayPrice, formatCurrency } from '@/lib/utils/pricing';
import type { Product, StockSummary } from '@shared/types';

interface POSAdvancedSearchModalProps {
  products: Product[];
  stockData: Record<number, StockSummary>;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

function StockBadge({ productId, stockData }: { productId: number; stockData: Record<number, StockSummary> }) {
  const s = stockData[productId];
  if (!s) return null;
  if (s.status === 'out') return (
    <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Sin stock</span>
  );
  if (s.status === 'low') return (
    <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
      Stock: {s.currentQuantity}
    </span>
  );
  return (
    <span className="text-xs text-gray-400">Stock: {s.currentQuantity}</span>
  );
}

export function POSAdvancedSearchModal({
  products,
  stockData,
  onSelect,
  onClose,
}: POSAdvancedSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('__all__');

  // Categorías únicas derivadas de los productos
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category ?? '').filter(Boolean)),
    ).sort();
    return cats;
  }, [products]);

  // Filtrado por categoría + búsqueda de texto
  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== '__all__') {
      list = list.filter((p) => (p.category ?? '') === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, activeCategory, query]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, descripción o SKU…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs por categoría */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-100 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory('__all__')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === '__all__'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Grilla de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Sin productos</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p) => {
                const stock = stockData[p.id];
                const isOut = stock?.status === 'out';
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p)}
                    disabled={isOut}
                    className={`text-left p-3 border rounded-xl transition-all ${
                      isOut
                        ? 'opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900 leading-tight mb-1">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-xs text-gray-500 leading-snug mb-1.5 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-1 mt-auto">
                      <StockBadge productId={p.id} stockData={stockData} />
                      <span className="text-sm font-bold text-blue-600 shrink-0">
                        {formatCurrency(getDisplayPrice(p.basePrice, p.taxRate))}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-right">
          {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
          {activeCategory !== '__all__' || query ? ` filtrados de ${products.length}` : ''}
        </div>
      </div>
    </div>
  );
}
