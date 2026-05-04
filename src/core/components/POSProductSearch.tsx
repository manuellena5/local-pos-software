import { useState, useEffect, useRef } from 'react';
import { useProducts } from '@/core/hooks/useProducts';
import { usePOSStore } from '@/core/store/posStore';
import { getDisplayPrice, formatCurrency } from '@/lib/utils/pricing';
import type { Product, StockSummary } from '@shared/types';

interface POSProductSearchProps {
  businessUnitId: number;
  stockData: Record<number, StockSummary>;
}

export function POSProductSearch({ businessUnitId, stockData }: POSProductSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const addToCart = usePOSStore((s) => s.addToCart);

  // Debounce: esperar 300ms antes de buscar
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { products } = useProducts(businessUnitId, debouncedQuery || undefined);

  const visibleProducts = debouncedQuery.length >= 1 ? products.slice(0, 8) : [];

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(product: Product) {
    addToCart({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity: 1,
      unitPrice: getDisplayPrice(product.basePrice, product.taxRate),
      taxRate: product.taxRate,
      discountPercent: 0,
    });
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
  }

  function getStockBadge(productId: number) {
    const s = stockData[productId];
    if (!s) return null;
    if (s.status === 'out') {
      return (
        <span className="ml-2 text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
          Sin stock
        </span>
      );
    }
    if (s.status === 'low') {
      return (
        <span className="ml-2 text-xs font-semibold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
          Stock: {s.currentQuantity}
        </span>
      );
    }
    return (
      <span className="ml-2 text-xs text-gray-400">
        Stock: {s.currentQuantity}
      </span>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query.length >= 1 && setOpen(true)}
        placeholder="Buscar producto por nombre o SKU..."
        className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        autoComplete="off"
      />

      {open && visibleProducts.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-72 overflow-y-auto">
          {visibleProducts.map((p) => {
            const stock = stockData[p.id];
            const isOut = stock?.status === 'out';
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between
                  ${isOut ? 'opacity-60 bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'}`}
              >
                <div className="flex items-center flex-wrap gap-x-1 min-w-0">
                  <span className={`font-medium ${isOut ? 'text-gray-500' : 'text-gray-900'}`}>
                    {p.name}
                  </span>
                  <span className="text-xs text-gray-400">{p.sku}</span>
                  {p.category && (
                    <span className="text-xs text-gray-400">· {p.category}</span>
                  )}
                  {getStockBadge(p.id)}
                </div>
                <span className={`text-sm font-bold shrink-0 ml-2 ${isOut ? 'text-gray-400' : 'text-blue-600'}`}>
                  {formatCurrency(getDisplayPrice(p.basePrice, p.taxRate))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open && debouncedQuery.length >= 1 && visibleProducts.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-4 py-3 text-sm text-gray-400">
          Sin resultados para &quot;{debouncedQuery}&quot;
        </div>
      )}
    </div>
  );
}
