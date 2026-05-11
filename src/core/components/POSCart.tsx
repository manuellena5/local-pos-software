import { useState } from 'react';
import { useCart } from '@/core/hooks/useCart';
import { formatCurrency } from '@/lib/utils/pricing';
import type { StockSummary } from '@shared/types';

interface POSCartProps {
  stockData: Record<number, StockSummary>;
}

export function POSCart({ stockData }: POSCartProps) {
  const { cart, removeFromCart, updateQuantity, updateItemDiscount } = useCart();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
        Buscá un producto para agregar al carrito
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b sticky top-0 z-10">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Producto</th>
            <th className="text-center px-2 py-2 font-medium text-gray-600 w-24">Cant.</th>
            <th className="text-right px-2 py-2 font-medium text-gray-600 w-28">Precio</th>
            <th className="text-center px-2 py-2 font-medium text-gray-600 w-20">Desc %</th>
            <th className="text-right px-2 py-2 font-medium text-gray-600 w-28">Subtotal</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item) => {
            const stock = stockData[item.productId];
            const available = stock?.currentQuantity ?? Infinity;
            const insufficient = item.quantity > available;

            return (
              <tr
                key={item.productId}
                className={`border-b ${insufficient ? 'bg-red-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-900 leading-tight">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.sku}</div>
                  {insufficient && (
                    <div className="text-xs text-red-600 font-medium mt-0.5">
                      ⚠ Disponible: {available === Infinity ? '?' : available}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-base leading-none"
                    >
                      −
                    </button>
                    {editingId === item.productId ? (
                      <input
                        type="number"
                        min={1}
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          const val = parseInt(editingValue, 10);
                          if (!isNaN(val) && val > 0) updateQuantity(item.productId, val);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            if (e.key === 'Enter') {
                              const val = parseInt(editingValue, 10);
                              if (!isNaN(val) && val > 0) updateQuantity(item.productId, val);
                            }
                            setEditingId(null);
                          }
                        }}
                        className="w-10 text-center font-medium border border-blue-400 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingId(item.productId); setEditingValue(String(item.quantity)); }}
                        className={`w-8 text-center font-medium cursor-pointer hover:bg-blue-50 rounded px-1 ${insufficient ? 'text-red-600' : ''}`}
                        title="Click para editar cantidad"
                      >
                        {item.quantity}
                      </span>
                    )}
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-base leading-none"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="text-right px-2 py-2 text-gray-700">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={item.discountPercent || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0 && val <= 100) {
                        updateItemDiscount(item.productId, val);
                      } else if (e.target.value === '') {
                        updateItemDiscount(item.productId, 0);
                      }
                    }}
                    placeholder="0"
                    className="w-full text-center px-1 py-1 border border-gray-300 rounded text-sm"
                  />
                </td>
                <td className="text-right px-2 py-2 font-semibold text-gray-900">
                  {formatCurrency(item.lineTotal)}
                </td>
                <td className="px-1 py-2">
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none"
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
