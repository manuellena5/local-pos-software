import { useState, useMemo, useCallback } from 'react';
import { X, Search, Minus, Plus, ShoppingCart, ChevronLeft } from 'lucide-react';
import { getDisplayPrice, formatCurrency } from '@/lib/utils/pricing';
import { useBarcodeScanner } from '@/core/pos/hooks/useBarcodeScanner';
import { productsApi } from '@/lib/api/products';
import { variantsApi } from '@/lib/api/variants';
import { usePOSStore } from '@/core/store/posStore';
import type { ProductSearchResult, StockSummary, ProductVariant } from '@shared/types';

interface SelectedItem {
  productId: number;
  variantId?: number;
  variantLabel?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  availableStock?: number;
}

interface POSAdvancedSearchModalProps {
  businessUnitId: number;
  products: ProductSearchResult[];
  stockData: Record<number, StockSummary>;
  onClose: () => void;
}

function selKey(item: Pick<SelectedItem, 'productId' | 'variantId'>): string {
  return `${item.productId}-${item.variantId ?? ''}`;
}

export function POSAdvancedSearchModal({
  businessUnitId,
  products,
  stockData,
  onClose,
}: POSAdvancedSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('__all__');
  const [scanToast, setScanToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedItem[]>([]);

  // Selector de variantes inline
  const [variantProduct, setVariantProduct] = useState<ProductSearchResult | null>(null);
  const [variantList, setVariantList] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const addToCartStore = usePOSStore((s) => s.addToCart);

  // ── Barcode scanner ────────────────────────────────────────────────────────
  const handleScan = useCallback(async (barcode: string) => {
    try {
      const result = await productsApi.findByBarcode(barcode, businessUnitId);
      if (!result.found) {
        setScanToast(`Código no encontrado: ${barcode}`);
        setTimeout(() => setScanToast(null), 2500);
        return;
      }
      const { item } = result;
      if (item.stock <= 0) {
        setScanToast(`Sin stock: ${item.name}`);
        setTimeout(() => setScanToast(null), 2500);
        return;
      }
      addToSelection({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: 1,
        unitPrice: getDisplayPrice(item.basePrice, item.taxRate),
        taxRate: item.taxRate,
        availableStock: item.stock,
      });
      setScanToast(`✓ ${item.name}`);
      setTimeout(() => setScanToast(null), 1500);
    } catch {
      setScanToast('Error al buscar el producto');
      setTimeout(() => setScanToast(null), 2500);
    }
  }, [businessUnitId]);

  useBarcodeScanner({ onScan: handleScan, captureInInputs: true });

  // ── Filtros ────────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((p) => p.category ?? '').filter(Boolean)),
    ).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== '__all__') {
      list = list.filter((p) => (p.category ?? '') === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
      list = list.filter((p) => {
        const normalize = (s: string) => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
        return (
          normalize(p.name).includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          normalize(p.description ?? '').includes(q)
        );
      });
    }
    return list;
  }, [products, activeCategory, query]);

  // ── Selección ─────────────────────────────────────────────────────────────
  function addToSelection(item: Omit<SelectedItem, 'quantity'> & { quantity?: number }) {
    const key = selKey(item);
    setSelected((prev) => {
      const idx = prev.findIndex((s) => selKey(s) === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + (item.quantity ?? 1) };
        return next;
      }
      return [...prev, { ...item, quantity: item.quantity ?? 1 }];
    });
  }

  function changeQty(key: string, delta: number) {
    setSelected((prev) => {
      return prev
        .map((s) => selKey(s) === key ? { ...s, quantity: s.quantity + delta } : s)
        .filter((s) => s.quantity > 0);
    });
  }

  function removeItem(key: string) {
    setSelected((prev) => prev.filter((s) => selKey(s) !== key));
  }

  // ── Abrir selector de variantes ────────────────────────────────────────────
  function openVariantPicker(p: ProductSearchResult) {
    setVariantProduct(p);
    setLoadingVariants(true);
    variantsApi
      .getByProduct(p.id)
      .then((v) => { setVariantList(v.filter((x) => x.isActive)); setLoadingVariants(false); })
      .catch(() => setLoadingVariants(false));
  }

  function handleVariantSelect(variant: ProductVariant) {
    if (!variantProduct || variant.stock === 0) return;
    addToSelection({
      productId: variantProduct.id,
      variantId: variant.id,
      variantLabel: `${variant.attributeType}: ${variant.attributeValue}`,
      name: variantProduct.name,
      sku: variant.sku ?? variantProduct.sku,
      unitPrice: variant.price,
      taxRate: variantProduct.taxRate,
      availableStock: variant.stock,
    });
    setVariantProduct(null);
    setVariantList([]);
  }

  // ── Click en tarjeta de producto ──────────────────────────────────────────
  function handleProductClick(p: ProductSearchResult) {
    if (p.hasVariants) {
      openVariantPicker(p);
      return;
    }
    const stock = stockData[p.id];
    if (stock?.status === 'out') return;
    addToSelection({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      unitPrice: getDisplayPrice(p.basePrice, p.taxRate),
      taxRate: p.taxRate,
      availableStock: stock?.currentQuantity,
    });
  }

  // ── Confirmar ─────────────────────────────────────────────────────────────
  function handleConfirm() {
    for (const item of selected) {
      addToCartStore({
        productId: item.productId,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discountPercent: 0,
        availableStock: item.availableStock,
      });
    }
    onClose();
  }

  const totalItems = selected.reduce((s, i) => s + i.quantity, 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Toast de scan */}
        {scanToast && (
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 text-white text-xs font-medium px-4 py-2 rounded-lg shadow pointer-events-none ${scanToast.startsWith('✓') ? 'bg-green-600' : 'bg-red-600'}`}>
            {scanToast}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
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
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs por categoría */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-100 overflow-x-auto scrollbar-hide shrink-0">
          <button
            onClick={() => setActiveCategory('__all__')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === '__all__' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todas ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat} ({products.filter((p) => p.category === cat).length})
            </button>
          ))}
        </div>

        {/* Cuerpo: grilla + panel de selección */}
        <div className="flex flex-1 min-h-0">

          {/* ── Grilla de productos ── */}
          <div className="flex-1 overflow-y-auto p-4 min-w-0">
            {/* Selector de variantes inline */}
            {variantProduct ? (
              <div className="flex flex-col h-full">
                <button
                  onClick={() => setVariantProduct(null)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 self-start"
                >
                  <ChevronLeft size={16} /> Volver
                </button>
                <p className="font-semibold text-gray-900 mb-1">{variantProduct.name}</p>
                <p className="text-xs text-gray-400 mb-4">Seleccioná una variante para agregar</p>
                {loadingVariants ? (
                  <p className="text-sm text-gray-400">Cargando variantes…</p>
                ) : variantList.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin variantes disponibles</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {variantList.map((v) => {
                      const noStock = v.stock === 0;
                      const alreadySelected = selected.some(
                        (s) => s.productId === variantProduct.id && s.variantId === v.id,
                      );
                      return (
                        <button
                          key={v.id}
                          onClick={() => handleVariantSelect(v)}
                          disabled={noStock}
                          className={`text-left p-3 border rounded-xl transition-all relative ${
                            noStock
                              ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed'
                              : alreadySelected
                              ? 'border-green-400 bg-green-50 hover:bg-green-100'
                              : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          {alreadySelected && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                              ✓
                            </span>
                          )}
                          <p className="text-sm font-semibold text-gray-900 leading-tight mb-1">
                            {v.attributeValue}
                          </p>
                          <div className="flex items-center justify-between gap-1">
                            {noStock ? (
                              <span className="text-xs text-red-500">Sin stock</span>
                            ) : (
                              <span className="text-xs text-gray-400">Stock: {v.stock}</span>
                            )}
                            <span className="text-sm font-bold text-blue-600">{formatCurrency(v.price)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">Sin productos</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((p) => {
                  const stock = stockData[p.id];
                  const isOut = !p.hasVariants && stock?.status === 'out';
                  const selectedQty = selected
                    .filter((s) => s.productId === p.id)
                    .reduce((sum, s) => sum + s.quantity, 0);
                  const isSelected = selectedQty > 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      disabled={isOut}
                      className={`text-left p-3 border rounded-xl transition-all relative ${
                        isOut
                          ? 'opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed'
                          : isSelected
                          ? 'border-green-400 bg-green-50 hover:bg-green-100'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
                      }`}
                    >
                      {/* Badge de cantidad seleccionada */}
                      {isSelected && (
                        <span className="absolute top-2 right-2 min-w-[20px] h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1">
                          {selectedQty}
                        </span>
                      )}

                      <p className="text-sm font-semibold text-gray-900 leading-tight mb-1 pr-6">
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="text-xs text-gray-500 leading-snug mb-1.5 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-1 mt-auto">
                        {p.hasVariants ? (
                          <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            {p.variantCount} variante{p.variantCount !== 1 ? 's' : ''}
                          </span>
                        ) : stock?.status === 'out' ? (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Sin stock</span>
                        ) : stock?.status === 'low' ? (
                          <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">Stock: {stock.currentQuantity}</span>
                        ) : (
                          <span className="text-xs text-gray-400">Stock: {stock?.currentQuantity ?? '—'}</span>
                        )}
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

          {/* ── Panel de selección ── */}
          <div className="w-64 shrink-0 border-l border-gray-100 flex flex-col bg-gray-50/50">
            <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Seleccionados
              </span>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {selected.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  Hacé click en un producto para agregarlo
                </p>
              ) : (
                selected.map((item) => {
                  const key = selKey(item);
                  const overStock =
                    item.availableStock !== undefined && item.quantity > item.availableStock;
                  return (
                    <div
                      key={key}
                      className={`bg-white rounded-lg border p-2 text-xs ${overStock ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 leading-tight truncate">{item.name}</p>
                          {item.variantLabel && (
                            <p className="text-purple-600 truncate">{item.variantLabel}</p>
                          )}
                          {overStock && (
                            <p className="text-red-500">⚠ Disp: {item.availableStock}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(key)}
                          className="text-gray-300 hover:text-red-500 shrink-0 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => changeQty(key, -1)}
                            className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-5 text-center font-semibold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => changeQty(key, 1)}
                            className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Botón confirmar */}
            <div className="px-3 py-3 border-t border-gray-100 shrink-0">
              <button
                onClick={handleConfirm}
                disabled={selected.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCart size={16} />
                {totalItems > 0
                  ? `Agregar ${totalItems} al carrito`
                  : 'Agregar al carrito'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-right shrink-0">
          {variantProduct
            ? `${variantList.length} variante${variantList.length !== 1 ? 's' : ''}`
            : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}${activeCategory !== '__all__' || query ? ` de ${products.length}` : ''}`}
        </div>
      </div>
    </div>
  );
}
