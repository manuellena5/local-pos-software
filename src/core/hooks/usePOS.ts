import { useState } from 'react';
import { salesApi } from '@/lib/api/sales';
import { usePOSStore } from '@/core/store/posStore';
import type { SaleWithItems } from '@shared/types';

export function usePOS(businessUnitId: number, customerId?: number) {
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<SaleWithItems | null>(null);

  const cart = usePOSStore((s) => s.cart);
  const discountPercent = usePOSStore((s) => s.discountPercent);
  const discountAmount = usePOSStore((s) => s.discountAmount);
  const paymentMethods = usePOSStore((s) => s.paymentMethods);
  const setIsProcessing = usePOSStore((s) => s.setIsProcessing);
  const isProcessing = usePOSStore((s) => s.isProcessing);
  const clearCart = usePOSStore((s) => s.clearCart);

  const confirmSale = async (): Promise<{ result: SaleWithItems | null; errorMsg: string | null }> => {
    if (cart.length === 0) {
      const msg = 'El carrito está vacío';
      setError(msg);
      return { result: null, errorMsg: msg };
    }
    if (paymentMethods.length === 0) {
      const msg = 'Debe seleccionar un medio de pago';
      setError(msg);
      return { result: null, errorMsg: msg };
    }

    setError(null);
    setIsProcessing(true);

    try {
      const result = await salesApi.confirm({
        businessUnitId,
        customerId: customerId ?? undefined,
        items: cart.map((c) => ({
          productId: c.productId,
          variantId: c.variantId,
          // Snapshot con variante para tickets y reportes: "Velas - Fragancia: Breeze"
          productName: c.variantLabel ? `${c.name} - ${c.variantLabel}` : c.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          taxRate: c.taxRate,
          discountPercent: c.discountPercent,
        })),
        discountPercent,
        discountAmount,
        paymentMethods,
      });

      setLastSale(result);
      clearCart();
      return { result, errorMsg: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al confirmar la venta';
      setError(msg);
      return { result: null, errorMsg: msg };
    } finally {
      setIsProcessing(false);
    }
  };

  return { confirmSale, isProcessing, error, lastSale };
}
