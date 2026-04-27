import { useCart } from '@/core/hooks/useCart';
import type { StockSummary } from '@shared/types';

interface POSCartProps {
  stockData: Record<number, StockSummary>;
}

export function POSCart({ stockData }: POSCartProps) {
  const { cart, totals, removeFromCart, updateQuantity, updateItemDiscount } = useCart();

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
        Buscá un producto para agregar al carrito
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Producto</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600 w-24">Cant.</th>
              <th className="text-right px-2 py-2 font-medium text-gray-600 w-24">Precio</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600 w-20">Desc %</th>
              <th className="text-right px-2 py-2 font-medium text-gray-600 w-24">Subtotal</th>
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
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.sku}</div>
                    {insufficient && (
                      <div className="text-xs text-red-600 font-medium mt-0.5">
                        ⚠ Stock insuficiente — disponible: {available === Infinity ? '?' : available}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
                      >
                        −
                      </button>
                      <span className={`w-8 text-center font-medium ${insufficient ? 'text-red-600' : ''}`}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="text-right px-2 py-2 text-gray-700">
                    ${item.unitPrice.toFixed(2)}
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
                    ${item.lineTotal.toFixed(2)}
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

      {/* Totales */}
      <div className="border-t pt-3 mt-2 space-y-1 px-3 pb-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>${totals.subtotal.toFixed(2)}</span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Descuento</span>
            <span>−${totals.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-600">
          <span>IVA ({cart[0]?.taxRate ?? 21}%)</span>
          <span>${totals.taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-1 mt-1">
          <span>TOTAL</span>
          <span>${totals.totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
