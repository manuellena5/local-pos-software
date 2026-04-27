import { usePOSStore } from '@/core/store/posStore';
import type { CartItem } from '@shared/types';

export function useCart() {
  const cart = usePOSStore((s) => s.cart);
  const discountPercent = usePOSStore((s) => s.discountPercent);
  const discountAmount = usePOSStore((s) => s.discountAmount);
  const paymentMethods = usePOSStore((s) => s.paymentMethods);
  const isProcessing = usePOSStore((s) => s.isProcessing);

  const addToCart = usePOSStore((s) => s.addToCart);
  const removeFromCart = usePOSStore((s) => s.removeFromCart);
  const updateQuantity = usePOSStore((s) => s.updateQuantity);
  const updateItemDiscount = usePOSStore((s) => s.updateItemDiscount);
  const setDiscountPercent = usePOSStore((s) => s.setDiscountPercent);
  const setDiscountAmount = usePOSStore((s) => s.setDiscountAmount);
  const setPaymentMethods = usePOSStore((s) => s.setPaymentMethods);
  const clearCart = usePOSStore((s) => s.clearCart);
  const getTotals = usePOSStore((s) => s.getTotals);

  const totals = getTotals();

  return {
    cart,
    discountPercent,
    discountAmount,
    paymentMethods,
    isProcessing,
    totals,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemDiscount,
    setDiscountPercent,
    setDiscountAmount,
    setPaymentMethods,
    clearCart,
  };
}
