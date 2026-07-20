import { useEffect } from 'react';
import { variantsApi } from '@/lib/api/variants';
import { useVariantsFormStore } from '../store/variantsFormStore';

/**
 * Carga las variantes de un producto existente en el store del formulario.
 * Si es un producto nuevo (productId undefined), inicializa el store vacío.
 */
export function useProductVariants(
  productId: number | undefined,
  basePrice: number,
  baseCost: number
): void {
  const loadFromDb = useVariantsFormStore((s) => s.loadFromDb);
  const resetForNew = useVariantsFormStore((s) => s.resetForNew);

  useEffect(() => {
    if (!productId) {
      // No pisar variantes ya cargadas en el store: este efecto corre en cada
      // montaje de VariantesTab, incluida una simple ida y vuelta entre tabs
      // durante la creación de un producto nuevo (antes de guardar).
      const { hasVariants, variants } = useVariantsFormStore.getState();
      if (!hasVariants && variants.length === 0) {
        resetForNew(basePrice, baseCost);
      }
      return;
    }
    variantsApi
      .getByProduct(productId)
      .then((variants) => {
        loadFromDb(variants, basePrice, baseCost);
      })
      .catch(() => {
        resetForNew(basePrice, baseCost);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]); // Solo recargar cuando cambia el producto, no en cada cambio de precio
}
