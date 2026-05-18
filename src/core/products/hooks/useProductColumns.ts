import { useProductsStore } from '../store/productsStore';
import { ALL_COLUMNS, type ColumnId } from '../types';

export function useProductColumns() {
  const visibleColumns = useProductsStore((s) => s.visibleColumns);
  const toggleColumn   = useProductsStore((s) => s.toggleColumn);

  const isVisible = (id: ColumnId) => visibleColumns.has(id);

  return { visibleColumns, toggleColumn, isVisible, allColumns: ALL_COLUMNS };
}
