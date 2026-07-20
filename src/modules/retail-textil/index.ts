/**
 * Módulo retail-textil.
 * Este archivo se importa una sola vez en App.tsx.
 * Registra las extensiones del formulario de producto del core.
 */
import {
  registerProductExtension,
  registerProductTab,
  registerProductSaveHook,
  registerPOSProductInterceptor,
  registerPOSOverlayComponent,
} from '@/core/api';
import { ProductAttributesPanel } from './components/ProductAttributesPanel';
import { ProductImagesPanel } from './components/ProductImagesPanel';
import { CatalogToggle } from './components/CatalogToggle';
import { VariantesTab } from './components/VariantesTab';
import { VariantSelectorOverlay } from './components/VariantSelectorOverlay';
import { variantsApi } from '@/lib/api/variants';
import { useVariantsFormStore } from './store/variantsFormStore';
import { useVariantSelectorStore } from './store/variantSelectorStore';
import type { ProductSearchResult } from '@shared/types';

export function initRetailTextilModule(): void {
  registerProductExtension({ name: 'retail-textil:images', component: ProductImagesPanel });
  registerProductExtension({ name: 'retail-textil:attributes', component: ProductAttributesPanel });
  registerProductExtension({ name: 'retail-textil:catalog', component: CatalogToggle });

  registerProductTab({
    id: 'variantes',
    label: 'Variantes',
    insertAfter: 'precios',
    component: VariantesTab,
  });

  registerProductSaveHook(async (productId, businessUnitId, _isCreating) => {
    const { hasVariants, attributeType, variants } = useVariantsFormStore.getState();

    if (!hasVariants || variants.length === 0) return;

    const invalid = variants.find((v) => !v.price || v.price <= 0);
    if (invalid) {
      throw new Error(`La variante "${invalid.attributeValue}" debe tener precio mayor a 0`);
    }

    await variantsApi.upsert(productId, businessUnitId, {
      attributeType: attributeType || 'Fragancia',
      variants: variants.map((v) => ({
        id: v.id,
        attributeValue: v.attributeValue,
        price: v.price,
        costPrice: v.costPrice,
        barcode: v.barcode || null,
        stock: v.stock,
      })),
    });

    useVariantsFormStore.getState().reset();
  });

  registerPOSProductInterceptor((product, addToCart, businessUnitId) => {
    const p = product as ProductSearchResult;
    if (!p.hasVariants) return false;

    if (p.variantCount === 1) {
      // Variante única: agregar directamente sin mostrar selector
      void variantsApi.getByProduct(p.id).then((variants) => {
        const v =
          variants.find((x) => x.isActive && x.stock > 0) ?? variants.find((x) => x.isActive);
        if (!v) return;
        addToCart({
          productId: p.id,
          variantId: v.id,
          variantLabel: `${v.attributeType}: ${v.attributeValue}`,
          name: p.name,
          sku: v.sku ?? p.sku,
          quantity: 1,
          unitPrice: v.price,
          taxRate: p.taxRate,
          discountPercent: 0,
          availableStock: v.stock,
        });
      });
      return true;
    }

    // Múltiples variantes: abrir selector
    useVariantSelectorStore.getState().open(p, businessUnitId, addToCart);
    return true;
  });

  registerPOSOverlayComponent(VariantSelectorOverlay);
}
