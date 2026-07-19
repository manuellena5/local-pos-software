import { create } from 'zustand';
import type { ProductVariant } from '@shared/types';

export interface VariantRow {
  id?: number;
  attributeValue: string;
  price: number;
  costPrice: number;
  stock: number;
  barcode: string;
  hasSales?: boolean;
}

interface VariantsFormState {
  hasVariants: boolean;
  attributeType: string;
  variants: VariantRow[];
  // Loaded from DB when editing — used to detect removed rows
  originalVariantIds: number[];

  setHasVariants: (v: boolean) => void;
  setAttributeType: (t: string) => void;
  setVariants: (rows: VariantRow[]) => void;
  addVariant: (row: VariantRow) => void;
  updateVariant: (index: number, patch: Partial<VariantRow>) => void;
  removeVariant: (index: number) => void;
  loadFromDb: (variants: ProductVariant[], basePrice: number, baseCost: number) => void;
  resetForNew: (basePrice: number, baseCost: number) => void;
  reset: () => void;
}

export const useVariantsFormStore = create<VariantsFormState>((set) => ({
  hasVariants: false,
  attributeType: 'Fragancia',
  variants: [],
  originalVariantIds: [],

  setHasVariants: (v) => set({ hasVariants: v }),
  setAttributeType: (t) => set({ attributeType: t }),
  setVariants: (rows) => set({ variants: rows }),

  addVariant: (row) =>
    set((s) => ({ variants: [...s.variants, row] })),

  updateVariant: (index, patch) =>
    set((s) => ({
      variants: s.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    })),

  removeVariant: (index) =>
    set((s) => ({ variants: s.variants.filter((_, i) => i !== index) })),

  loadFromDb: (dbVariants, basePrice, baseCost) => {
    if (dbVariants.length === 0) {
      set({ hasVariants: false, variants: [], originalVariantIds: [] });
      return;
    }
    set({
      hasVariants: true,
      attributeType: dbVariants[0].attributeType,
      originalVariantIds: dbVariants.map((v) => v.id),
      variants: dbVariants.map((v) => ({
        id: v.id,
        attributeValue: v.attributeValue,
        price: v.price,
        costPrice: v.costPrice,
        stock: v.stock,
        barcode: v.barcode ?? '',
        hasSales: v.hasSales,
      })),
    });
    void basePrice; void baseCost;
  },

  resetForNew: (basePrice, baseCost) => {
    set({
      hasVariants: false,
      attributeType: 'Fragancia',
      variants: [],
      originalVariantIds: [],
    });
    void basePrice; void baseCost;
  },

  reset: () =>
    set({
      hasVariants: false,
      attributeType: 'Fragancia',
      variants: [],
      originalVariantIds: [],
    }),
}));
