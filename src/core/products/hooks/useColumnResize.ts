import { useCallback, useRef, useState } from 'react';
import type { ColumnId } from '../types';

const STORAGE_KEY = 'localpos.products.colwidths';

export const DEFAULT_WIDTHS: Partial<Record<ColumnId, number>> = {
  name:             200,
  category:         110,
  cost:             100,
  price:            120,
  margin:            90,
  stock:             80,
  lastSupplier:     140,
  barcode:          130,
  supplierCode:     110,
  priceNet:         110,
  ivaRate:           70,
  lastPurchaseDate: 110,
  actions:           90,
};

export function loadWidths(): Partial<Record<ColumnId, number>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveWidths(widths: Partial<Record<ColumnId, number>>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widths)); } catch { /* ignore */ }
}

export function useColumnResize() {
  const init = () => ({ ...DEFAULT_WIDTHS, ...loadWidths() });
  const widthsRef = useRef<Partial<Record<ColumnId, number>>>(init());
  const [widths, setWidths] = useState(widthsRef.current);

  const getWidth = useCallback(
    (col: ColumnId) => widthsRef.current[col] ?? DEFAULT_WIDTHS[col] ?? 100,
    [],
  );

  // setWidth: called during drag from the ResizeHandle element listeners
  const setWidth = useCallback((col: ColumnId, newW: number) => {
    widthsRef.current = { ...widthsRef.current, [col]: newW };
    setWidths({ ...widthsRef.current });
  }, []);

  // commit: called on pointerup to persist
  const commit = useCallback(() => {
    saveWidths(widthsRef.current);
  }, []);

  return { getWidth, setWidth, commit, widths };
}
