import { create } from 'zustand';
import type { CartItem, PaymentMethod } from '@shared/types';

interface CartTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

interface POSState {
  cart: CartItem[];
  discountPercent: number;
  discountAmount: number;
  paymentMethods: PaymentMethod[];
  isProcessing: boolean;

  // Actions
  addToCart: (item: Omit<CartItem, 'lineTotal'>) => void;
  removeFromCart: (productId: number, variantId?: number) => void;
  updateQuantity: (productId: number, quantity: number, variantId?: number) => void;
  updateItemDiscount: (productId: number, discountPercent: number, variantId?: number) => void;
  setDiscountPercent: (pct: number) => void;
  setDiscountAmount: (amount: number) => void;
  setPaymentMethods: (methods: PaymentMethod[]) => void;
  setIsProcessing: (val: boolean) => void;
  clearCart: () => void;
  getTotals: () => CartTotals;
}

function calcLineTotal(item: Omit<CartItem, 'lineTotal'>): number {
  const raw = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
  return Math.round(raw * 100) / 100;
}

function sameKey(c: CartItem, productId: number, variantId?: number): boolean {
  return c.productId === productId && c.variantId === variantId;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discountPercent: 0,
  discountAmount: 0,
  paymentMethods: [],
  isProcessing: false,

  addToCart: (item) => {
    set((state) => {
      const existing = state.cart.find((c) => sameKey(c, item.productId, item.variantId));
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            sameKey(c, item.productId, item.variantId)
              ? {
                  ...c,
                  quantity: c.quantity + item.quantity,
                  lineTotal: calcLineTotal({
                    ...c,
                    quantity: c.quantity + item.quantity,
                  }),
                }
              : c
          ),
        };
      }
      return {
        cart: [...state.cart, { ...item, lineTotal: calcLineTotal(item) }],
      };
    });
  },

  removeFromCart: (productId, variantId) => {
    set((state) => ({ cart: state.cart.filter((c) => !sameKey(c, productId, variantId)) }));
  },

  updateQuantity: (productId, quantity, variantId) => {
    if (quantity < 1) return;
    set((state) => ({
      cart: state.cart.map((c) =>
        sameKey(c, productId, variantId)
          ? { ...c, quantity, lineTotal: calcLineTotal({ ...c, quantity }) }
          : c
      ),
    }));
  },

  updateItemDiscount: (productId, discountPercent, variantId) => {
    set((state) => ({
      cart: state.cart.map((c) =>
        sameKey(c, productId, variantId)
          ? {
              ...c,
              discountPercent,
              lineTotal: calcLineTotal({ ...c, discountPercent }),
            }
          : c
      ),
    }));
  },

  setDiscountPercent: (pct) => set({ discountPercent: pct, discountAmount: 0 }),
  setDiscountAmount: (amount) => set({ discountAmount: amount, discountPercent: 0 }),
  setPaymentMethods: (methods) => set({ paymentMethods: methods }),
  setIsProcessing: (val) => set({ isProcessing: val }),

  clearCart: () =>
    set({
      cart: [],
      discountPercent: 0,
      discountAmount: 0,
      paymentMethods: [],
      isProcessing: false,
    }),

  getTotals: (): CartTotals => {
    const { cart, discountPercent, discountAmount } = get();

    // subtotal = suma de lineTotals — cada lineTotal ya INCLUYE IVA
    // (unitPrice = displayPrice = basePrice * (1 + taxRate/100))
    const subtotal = Math.round(cart.reduce((sum, c) => sum + c.lineTotal, 0) * 100) / 100;

    // taxRate del primer ítem para el desglose
    const taxRate = cart[0]?.taxRate ?? 21;

    let resolvedDiscount: number;
    if (discountAmount > 0) {
      resolvedDiscount = Math.min(discountAmount, subtotal);
    } else if (discountPercent > 0) {
      resolvedDiscount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
    } else {
      resolvedDiscount = 0;
    }

    // totalAmount = subtotal - descuento (IVA ya está incluido, no se suma de nuevo)
    const totalAmount = Math.round((subtotal - resolvedDiscount) * 100) / 100;

    // Desglose fiscal: extraer IVA del total
    const taxableAmount = Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100;
    const taxAmount = Math.round((totalAmount - taxableAmount) * 100) / 100;

    return { subtotal, discountAmount: resolvedDiscount, taxableAmount, taxAmount, totalAmount };
  },
}));
