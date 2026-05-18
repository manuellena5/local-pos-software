import { create } from 'zustand';
import type { ProductWithStock } from '@shared/types';
import type { ChipFilter, ColumnId, ProductModalTab, ProductsFilter } from '../types';
import { ALL_COLUMNS } from '../types';

const COLUMNS_KEY = 'localpos.products.columns';

function loadVisibleColumns(): Set<ColumnId> {
  try {
    const raw = localStorage.getItem(COLUMNS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ColumnId[];
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch { /* ignore */ }
  return new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id));
}

function saveVisibleColumns(cols: Set<ColumnId>): void {
  try {
    localStorage.setItem(COLUMNS_KEY, JSON.stringify([...cols]));
  } catch { /* ignore */ }
}

interface ProductsState {
  // Columnas visibles
  visibleColumns: Set<ColumnId>;
  toggleColumn: (id: ColumnId) => void;
  setVisibleColumns: (cols: ColumnId[]) => void;

  // Filtros activos
  filter: ProductsFilter;
  setSearch: (search: string) => void;
  setCategory: (category: string) => void;
  setStockFilter: (stockFilter: ProductsFilter['stockFilter']) => void;
  setShowArchived: (show: boolean) => void;
  setChip: (chip: ChipFilter) => void;
  resetFilters: () => void;

  // Producto activo (para el modal de edición)
  activeProduct: ProductWithStock | null;
  setActiveProduct: (p: ProductWithStock | null) => void;

  // Modal de edición (product=null significa "crear nuevo")
  editModalOpen: boolean;
  editModalTab: ProductModalTab;
  openEditModal: (product: ProductWithStock | null, tab?: ProductModalTab) => void;
  closeEditModal: () => void;
  setEditModalTab: (tab: ProductModalTab) => void;

  // Drawer de historial
  drawerProductId: number | null;
  openDrawer: (productId: number) => void;
  closeDrawer: () => void;

  // Modal de stock
  stockModalProductId: number | null;
  openStockModal: (productId: number) => void;
  closeStockModal: () => void;

  // Modal masivo de precios
  bulkModalOpen: boolean;
  openBulkModal: () => void;
  closeBulkModal: () => void;
}

const DEFAULT_FILTER: ProductsFilter = {
  search:      '',
  category:    '',
  stockFilter: 'all',
  showArchived: false,
  chip:        'all',
};

export const useProductsStore = create<ProductsState>((set) => ({
  visibleColumns: loadVisibleColumns(),

  toggleColumn: (id) =>
    set((s) => {
      const next = new Set(s.visibleColumns);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveVisibleColumns(next);
      return { visibleColumns: next };
    }),

  setVisibleColumns: (cols) => {
    const next = new Set(cols as ColumnId[]);
    saveVisibleColumns(next);
    set({ visibleColumns: next });
  },

  filter: DEFAULT_FILTER,
  setSearch:       (search)      => set((s) => ({ filter: { ...s.filter, search, chip: 'all' } })),
  setCategory:     (category)    => set((s) => ({ filter: { ...s.filter, category } })),
  setStockFilter:  (stockFilter) => set((s) => ({ filter: { ...s.filter, stockFilter } })),
  setShowArchived: (showArchived) => set((s) => ({ filter: { ...s.filter, showArchived } })),
  setChip:         (chip)        => set((s) => ({ filter: { ...s.filter, chip, search: '' } })),
  resetFilters:    ()            => set({ filter: DEFAULT_FILTER }),

  activeProduct: null,
  setActiveProduct: (p) => set({ activeProduct: p }),

  editModalOpen: false,
  editModalTab:  'base',
  openEditModal: (product, tab = 'base') =>
    set({ activeProduct: product, editModalOpen: true, editModalTab: tab }),
  closeEditModal: () => set({ editModalOpen: false, activeProduct: null }),
  setEditModalTab: (tab) => set({ editModalTab: tab }),

  drawerProductId: null,
  openDrawer:  (productId) => set({ drawerProductId: productId }),
  closeDrawer: ()          => set({ drawerProductId: null }),

  stockModalProductId: null,
  openStockModal:  (productId) => set({ stockModalProductId: productId }),
  closeStockModal: ()          => set({ stockModalProductId: null }),

  bulkModalOpen: false,
  openBulkModal:  () => set({ bulkModalOpen: true }),
  closeBulkModal: () => set({ bulkModalOpen: false }),
}));
