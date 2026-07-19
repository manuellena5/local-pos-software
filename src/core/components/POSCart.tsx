import { useState, useCallback } from 'react';
import { useCart } from '@/core/hooks/useCart';
import { formatCurrency } from '@/lib/utils/pricing';
import type { CartItem, StockSummary } from '@shared/types';

function cartKey(item: CartItem): string {
  return `${item.productId}-${item.variantId ?? ''}`;
}

interface POSCartProps {
  stockData: Record<number, StockSummary>;
}

export function POSCart({ stockData }: POSCartProps) {
  const { cart, removeFromCart, updateQuantity, updateItemDiscount } = useCart();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [blockedKey, setBlockedKey] = useState<string | null>(null);

  const handleIncrement = useCallback((item: CartItem, key: string) => {
    const cap = item.availableStock;
    if (cap !== undefined && item.quantity >= cap) {
      setBlockedKey(key);
      setTimeout(() => setBlockedKey((k) => (k === key ? null : k)), 1500);
      return;
    }
    updateQuantity(item.productId, item.quantity + 1, item.variantId);
  }, [updateQuantity]);

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-8">
        Buscá un producto para agregar al carrito
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <table className="w-full" style={{ fontSize: 13 }}>
        <thead className="bg-gray-50 border-b sticky top-0 z-10">
          <tr>
            <th className="text-left px-2 py-1.5 font-medium text-gray-600">Producto</th>
            <th className="text-center px-1 py-1.5 font-medium text-gray-600 w-[90px]">Cant.</th>
            <th className="text-right px-1 py-1.5 font-medium text-gray-600 w-24">Precio</th>
            <th className="text-center px-1 py-1.5 font-medium text-gray-600 w-16">Desc%</th>
            <th className="text-right px-1 py-1.5 font-medium text-gray-600 w-24">Subtotal</th>
            <th className="w-6"></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item) => {
            const key = cartKey(item);
            const stock = stockData[item.productId];
            const available = item.availableStock !== undefined
              ? item.availableStock
              : (stock?.currentQuantity ?? Infinity);
            const insufficient = item.quantity > available;

            return (
              <tr
                key={key}
                className={`border-b ${insufficient ? 'bg-red-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-2 py-1.5">
                  <div className="font-medium text-gray-900 leading-tight">{item.name}</div>
                  {item.variantLabel && (
                    <div className="text-[11px] text-purple-600">{item.variantLabel}</div>
                  )}
                  <div className="text-[11px] text-gray-400">{item.sku}</div>
                  {insufficient && (
                    <div className="text-[11px] text-red-600 font-medium">
                      ⚠ Disp: {available === Infinity ? '?' : available}
                    </div>
                  )}
                </td>
                <td className="px-1 py-1.5">
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                      className="w-[22px] h-[22px] rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold leading-none"
                    >
                      −
                    </button>
                    {editingId === key ? (
                      <input
                        type="number"
                        min={1}
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          const val = parseInt(editingValue, 10);
                          if (!isNaN(val) && val > 0) updateQuantity(item.productId, val, item.variantId);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            if (e.key === 'Enter') {
                              const val = parseInt(editingValue, 10);
                              if (!isNaN(val) && val > 0) updateQuantity(item.productId, val, item.variantId);
                            }
                            setEditingId(null);
                          }
                        }}
                        className="w-8 text-center font-medium border border-blue-400 rounded px-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingId(key); setEditingValue(String(item.quantity)); }}
                        className={`w-6 text-center font-medium cursor-pointer hover:bg-blue-50 rounded ${insufficient ? 'text-red-600' : ''}`}
                        title="Click para editar cantidad"
                      >
                        {item.quantity}
                      </span>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => handleIncrement(item, key)}
                        className={`w-[22px] h-[22px] rounded flex items-center justify-center font-bold leading-none
                          ${item.availableStock !== undefined && item.quantity >= item.availableStock
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        +
                      </button>
                      {blockedKey === key && (
                        <span className="absolute right-full top-1/2 -translate-y-1/2 mr-1.5 whitespace-nowrap bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none z-10">
                          Máx. {item.availableStock}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-right px-1 py-1.5 text-gray-700">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-1 py-1.5">
                  <input
                    type="text"
                    value={item.discountPercent || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0 && val <= 100) {
                        updateItemDiscount(item.productId, val, item.variantId);
                      } else if (e.target.value === '') {
                        updateItemDiscount(item.productId, 0, item.variantId);
                      }
                    }}
                    placeholder="0"
                    className="w-full text-center px-1 py-0.5 border border-gray-300 rounded text-xs"
                  />
                </td>
                <td className="text-right px-1 py-1.5 font-semibold text-gray-900">
                  {formatCurrency(item.lineTotal)}
                </td>
                <td className="px-0.5 py-1.5">
                  <button
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                    className="text-red-400 hover:text-red-600 leading-none text-base"
                    title="Quitar del carrito"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
