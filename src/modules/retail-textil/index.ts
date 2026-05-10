/**
 * Módulo retail-textil.
 * Este archivo se importa una sola vez en App.tsx.
 * Registra las extensiones del formulario de producto del core.
 */
import { registerProductExtension } from '@/core/api';
import { ProductAttributesPanel } from './components/ProductAttributesPanel';
import { ProductImagesPanel } from './components/ProductImagesPanel';
import { CatalogToggle } from './components/CatalogToggle';

export function initRetailTextilModule(): void {
  registerProductExtension({ name: 'retail-textil:images',     component: ProductImagesPanel });
  registerProductExtension({ name: 'retail-textil:attributes', component: ProductAttributesPanel });
  registerProductExtension({ name: 'retail-textil:catalog',    component: CatalogToggle });
}
