import { useCallback, useEffect, useRef, useState } from 'react';
import { productsApi } from '@/lib/api/products';
import type { ProductWithStock } from '@shared/types';
import { useProductsStore } from '../store/productsStore';
import {
  computeChipCounts,
  filterByChip,
  type ProductsChipCounts,
} from '../types';

export function useProducts(businessUnitId: number) {
  const [allProducts, setAllProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filter = useProductsStore((s) => s.filter);

  // Solo mostramos el estado de carga completo (que reemplaza la tabla) en la
  // carga inicial o al cambiar de unidad de negocio — no en cada refetch tras
  // una edición, porque eso hace colapsar filas expandidas (ej. variantes).
  const loadedForBuRef = useRef<number | null>(null);

  const refetch = useCallback(async () => {
    try {
      if (loadedForBuRef.current !== businessUnitId) setLoading(true);
      setError(null);
      const data = await productsApi.listWithStock(businessUnitId);
      setAllProducts(data);
      loadedForBuRef.current = businessUnitId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [businessUnitId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Filtrado cliente: búsqueda, categoría, stock, chip, archivados
  const strip = /\p{Mn}/gu;
  const norm  = (s: string) => s.normalize('NFD').replace(strip, '').toLowerCase();

  const filtered = allProducts.filter((p) => {
    if (!filter.showArchived && !p.isActive) return false;
    if (filter.showArchived && p.isActive) return false;

    if (filter.search) {
      const q = norm(filter.search);
      if (
        !norm(p.name).includes(q) &&
        !p.sku.toLowerCase().includes(q) &&
        !norm(p.category ?? '').includes(q) &&
        !(p.barcode ?? '').toLowerCase().includes(q)
      ) return false;
    }

    if (filter.category && p.category !== filter.category) return false;

    if (filter.stockFilter === 'instock' && p.currentStock <= 0) return false;
    if (filter.stockFilter === 'low' && (p.currentStock <= 0 || p.currentStock > p.minimumThreshold)) return false;
    if (filter.stockFilter === 'out' && p.currentStock !== 0) return false;

    return true;
  });

  const chipFiltered = filterByChip(filtered, filter.chip);
  const chipCounts: ProductsChipCounts = computeChipCounts(filtered);

  const categories = [...new Set(allProducts.map((p) => p.category).filter((c): c is string => Boolean(c)))].sort();

  return { products: chipFiltered, allProducts, loading, error, refetch, chipCounts, categories };
}
