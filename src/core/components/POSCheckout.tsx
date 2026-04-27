import { useState } from 'react';
import { useCart } from '@/core/hooks/useCart';
import { usePOS } from '@/core/hooks/usePOS';
import { POSReceiptModal } from './POSReceiptModal';
import type { SaleWithItems, StockSummary } from '@shared/types';

interface POSCheckoutProps {
  businessUnitId: number;
  stockData: Record<number, StockSummary>;
  onSaleComplete: () => void;
}

export function POSCheckout({ businessUnitId, stockData, onSaleComplete }: POSCheckoutProps) {
  const { cart, totals, paymentMethods } = useCart();
  const { confirmSale, isProcessing, error } = usePOS(businessUnitId);
  const [completedSale, setCompletedSale] = useState<SaleWithItems | null>(null);

  const totalPaid = paymentMethods.reduce((s, p) => s + p.amount, 0);

  // Verificar stock insuficiente en cualquier ítem del carrito
  const stockIssues = cart.filter((item) => {
    const available = stockData[item.productId]?.currentQuantity;
    return available !== undefined && item.quantity > available;
  });
  const hasStockIssues = stockIssues.length > 0;

  const canConfirm =
    cart.length > 0 &&
    paymentMethods.length > 0 &&
    totalPaid >= totals.totalAmount - 1 &&
    !isProcessing &&
    !hasStockIssues;

  async function handleConfirm() {
    const result = await confirmSale();
    if (result) {
      setCompletedSale(result);
      onSaleComplete(); // refrescar stock en POSPage
    }
  }

  return (
    <>
      <div className="space-y-3">
        {/* Resumen */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Productos</span>
            <span>{cart.reduce((s, c) => s + c.quantity, 0)} uds.</span>
          </div>
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
            <span>IVA</span>
            <span>${totals.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-1">
            <span>TOTAL</span>
            <span>${totals.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Advertencia de stock insuficiente */}
        {hasStockIssues && (
          <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 space-y-0.5">
            <p className="font-semibold">Sin stock suficiente:</p>
            {stockIssues.map((item) => {
              const available = stockData[item.productId]?.currentQuantity ?? 0;
              return (
                <p key={item.productId} className="text-xs">
                  • {item.name}: pedís {item.quantity}, disponible {available}
                </p>
              );
            })}
          </div>
        )}

        {/* Error de API (solo si no hay problema de stock) */}
        {error && !hasStockIssues && (
          <p className="text-sm text-red-500 bg-red-50 rounded px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={`w-full py-3 rounded-lg font-bold text-base transition-colors ${
            canConfirm
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin text-lg">⏳</span> Procesando...
            </span>
          ) : (
            '✓ Confirmar venta'
          )}
        </button>

        {/* Mensajes contextuales bajo el botón */}
        {!canConfirm && cart.length === 0 && (
          <p className="text-xs text-center text-gray-400">Agregá productos al carrito</p>
        )}
        {!canConfirm && cart.length > 0 && paymentMethods.length === 0 && !hasStockIssues && (
          <p className="text-xs text-center text-gray-400">Seleccioná un medio de pago</p>
        )}
        {!canConfirm && paymentMethods.length > 0 && totalPaid < totals.totalAmount - 1 && !hasStockIssues && (
          <p className="text-xs text-center text-red-400">
            Falta ${(totals.totalAmount - totalPaid).toFixed(2)} por cubrir
          </p>
        )}
      </div>

      {completedSale && (
        <POSReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </>
  );
}
