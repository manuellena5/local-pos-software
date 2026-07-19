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
      resetForNew(basePrice, baseCost);
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
