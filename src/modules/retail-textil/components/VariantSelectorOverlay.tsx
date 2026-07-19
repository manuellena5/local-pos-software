import { useVariantSelectorStore } from '../store/variantSelectorStore';
import { VariantSelectorPopover } from './VariantSelectorPopover';

export function VariantSelectorOverlay() {
  const isOpen = useVariantSelectorStore((s) => s.isOpen);
  const product = useVariantSelectorStore((s) => s.product);
  const businessUnitId = useVariantSelectorStore((s) => s.businessUnitId);
  const addToCartFn = useVariantSelectorStore((s) => s.addToCartFn);
  const close = useVariantSelectorStore((s) => s.close);

  if (!isOpen || !product || !addToCartFn) return null;

  return (
    <VariantSelectorPopover
      product={product}
      businessUnitId={businessUnitId}
      addToCart={addToCartFn}
      onClose={close}
    />
  );
}
