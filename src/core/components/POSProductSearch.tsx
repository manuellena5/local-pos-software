import { useState, useEffect, useRef } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useProducts } from '@/core/hooks/useProducts';
import { usePOSStore } from '@/core/store/posStore';
import { getDisplayPrice, formatCurrency } from '@/lib/utils/pricing';
import { POSAdvancedSearchModal } from './POSAdvancedSearchModal';
import type { Product, StockSummary } from '@shared/types';

interface POSProductSearchProps {
  businessUnitId: number;
  stockData: Record<number, StockSummary>;
}

export function POSProductSearch({ businessUnitId, stockData }: POSProductSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addToCart = usePOSStore((s) => s.addToCart);

  // Debounce: esperar 300ms antes de buscar
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { products: searchResults } = useProducts(businessUnitId, debouncedQuery || undefined);
  // Para la búsqueda avanzada: todos los productos sin filtro
  const { products: allProducts } = useProducts(businessUnitId);

  const visibleProducts = debouncedQuery.length >= 1 ? searchResults.slice(0, 8) : [];

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

  // F2 → foco en búsqueda
  useEffect(() => {
    function handleF2(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener('keydown', handleF2);
    return () => document.removeEventListener('keydown', handleF2);
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
    setShowAdvanced(false);
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
    <>
      <div ref={wrapperRef} className="relative flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => query.length >= 1 && setOpen(true)}
            placeholder="Buscar producto por nombre, SKU o código de barras… (F2)"
            className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            autoComplete="off"
          />

          {open && visibleProducts.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-80 overflow-y-auto">
              {visibleProducts.map((p) => {
                const stock = stockData[p.id];
                const isOut = stock?.status === 'out';
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left px-4 py-2.5 border-b border-gray-100 last:border-b-0
                      ${isOut ? 'opacity-60 bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Línea principal: nombre + sku + categoría + stock */}
                        <div className="flex items-center flex-wrap gap-x-1">
                          <span className={`font-medium text-sm ${isOut ? 'text-gray-500' : 'text-gray-900'}`}>
                            {p.name}
                          </span>
                          <span className="text-xs text-gray-400">{p.sku}</span>
                          {p.category && (
                            <span className="text-xs text-gray-400">· {p.category}</span>
                          )}
                          {getStockBadge(p.id)}
                        </div>
                        {/* Descripción interna — clave para diferenciar variantes */}
                        {p.description && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug truncate">
                            {p.description}
                          </p>
                        )}
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${isOut ? 'text-gray-400' : 'text-blue-600'}`}>
                        {formatCurrency(getDisplayPrice(p.basePrice, p.taxRate))}
                      </span>
                    </div>
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

        {/* Botón de búsqueda avanzada */}
        <button
          onClick={() => setShowAdvanced(true)}
          title="Búsqueda avanzada por categoría (F3)"
          className="px-3 py-3 border-2 border-blue-300 rounded-lg text-blue-400 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0"
        >
          <LayoutGrid size={18} />
        </button>
      </div>

      {/* Modal de búsqueda avanzada */}
      {showAdvanced && (
        <POSAdvancedSearchModal
          businessUnitId={businessUnitId}
          products={allProducts}
          stockData={stockData}
          onSelect={handleSelect}
          onClose={() => setShowAdvanced(false)}
        />
      )}
    </>
  );
}
