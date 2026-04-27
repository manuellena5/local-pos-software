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
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemDiscount: (productId: number, discountPercent: number) => void;
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

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discountPercent: 0,
  discountAmount: 0,
  paymentMethods: [],
  isProcessing: false,

  addToCart: (item) => {
    set((state) => {
      const existing = state.cart.find((c) => c.productId === item.productId);
      if (existing) {
        // Incrementar cantidad si ya está en el carrito
        return {
          cart: state.cart.map((c) =>
            c.productId === item.productId
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

  removeFromCart: (productId) => {
    set((state) => ({ cart: state.cart.filter((c) => c.productId !== productId) }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity < 1) return;
    set((state) => ({
      cart: state.cart.map((c) =>
        c.productId === productId
          ? { ...c, quantity, lineTotal: calcLineTotal({ ...c, quantity }) }
          : c
      ),
    }));
  },

  updateItemDiscount: (productId, discountPercent) => {
    set((state) => ({
      cart: state.cart.map((c) =>
        c.productId === productId
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

    const subtotal = Math.round(cart.reduce((sum, c) => sum + c.lineTotal, 0) * 100) / 100;

    // IVA único sobre el total (Fase 3) — taxRate del primer ítem
    const taxRate = cart[0]?.taxRate ?? 21;

    let resolvedDiscount: number;
    if (discountAmount > 0) {
      resolvedDiscount = Math.min(discountAmount, subtotal);
    } else if (discountPercent > 0) {
      resolvedDiscount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
    } else {
      resolvedDiscount = 0;
    }

    const taxableAmount = Math.round((subtotal - resolvedDiscount) * 100) / 100;
    const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return { subtotal, discountAmount: resolvedDiscount, taxableAmount, taxAmount, totalAmount };
  },
}));
