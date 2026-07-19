import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { variantsApi } from '@/lib/api/variants';
import { formatCurrency } from '@/lib/utils/pricing';
import { LOW_STOCK_THRESHOLD } from '@shared/constants';
import type { ProductSearchResult, ProductVariant, CartItem } from '@shared/types';

interface VariantSelectorPopoverProps {
  product: ProductSearchResult;
  businessUnitId: number;
  addToCart: (item: Omit<CartItem, 'lineTotal'>) => void;
  onClose: () => void;
}

export function VariantSelectorPopover({
  product,
  businessUnitId: _businessUnitId,
  addToCart,
  onClose,
}: VariantSelectorPopoverProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    variantsApi
      .getByProduct(product.id)
      .then((v) => {
        setVariants(v.filter((x) => x.isActive));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [product.id]);

  function handleSelectVariant(variant: ProductVariant) {
    if (variant.stock === 0) return;
    addToCart({
      productId: product.id,
      variantId: variant.id,
      variantLabel: `${variant.attributeType}: ${variant.attributeValue}`,
      name: product.name,
      sku: variant.sku ?? product.sku,
      quantity: 1,
      unitPrice: variant.price,
      taxRate: product.taxRate,
      discountPercent: 0,
      availableStock: variant.stock,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">{product.name}</p>
            <p className="text-xs text-gray-400">Seleccioná una variante</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-6">Cargando variantes…</p>
          ) : variants.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">Sin variantes disponibles</p>
          ) : (
            <div className="flex flex-col gap-2">
              {variants.map((v) => {
                const noStock = v.stock === 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVariant(v)}
                    disabled={noStock}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm text-left transition-colors
                      ${
                        noStock
                          ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                  >
                    <span className="font-medium text-gray-900">{v.attributeValue}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {noStock ? (
                        <span className="text-xs text-red-500">Sin stock</span>
                      ) : v.stock === 1 ? (
                        <span className="text-xs font-semibold text-orange-500">Último</span>
                      ) : v.stock <= LOW_STOCK_THRESHOLD ? (
                        <span className="text-xs font-semibold text-yellow-600">Quedan {v.stock}</span>
                      ) : (
                        <span className="text-xs text-gray-400">Stock: {v.stock}</span>
                      )}
                      <span className="font-semibold text-blue-600">{formatCurrency(v.price)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
