import { create } from 'zustand';
import type { ProductSearchResult, CartItem } from '@shared/types';

interface VariantSelectorState {
  isOpen: boolean;
  product: ProductSearchResult | null;
  businessUnitId: number;
  addToCartFn: ((item: Omit<CartItem, 'lineTotal'>) => void) | null;
  open(
    product: ProductSearchResult,
    businessUnitId: number,
    fn: (item: Omit<CartItem, 'lineTotal'>) => void,
  ): void;
  close(): void;
}

export const useVariantSelectorStore = create<VariantSelectorState>((set) => ({
  isOpen: false,
  product: null,
  businessUnitId: 0,
  addToCartFn: null,
  open: (product, businessUnitId, fn) =>
    set({ isOpen: true, product, businessUnitId, addToCartFn: fn }),
  close: () => set({ isOpen: false }),
}));
