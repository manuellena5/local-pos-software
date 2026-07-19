import type { ComponentType } from 'react';
import type { ProductWithStock, CartItem, Product } from '@shared/types';

// ---------------------------------------------------------------------------
// Product extensions — módulos registran campos/UI extra en formularios de producto
// ---------------------------------------------------------------------------

export interface ProductExtension {
  name: string;
  component: ComponentType<{ productId: number; businessUnitId: number }>;
}

// ---------------------------------------------------------------------------
// Product tab extensions — módulos registran tabs extras en el formulario
// ---------------------------------------------------------------------------

export interface ProductTabComponentProps {
  product: ProductWithStock | undefined;
  formData: Partial<ProductWithStock>;
  businessUnitId: number;
  isCreating: boolean;
}

export interface ProductTabExtension {
  id: string;
  label: string;
  insertAfter: 'base' | 'precios' | 'catalogo';
  component: ComponentType<ProductTabComponentProps>;
}

const productTabExtensions: ProductTabExtension[] = [];

export function registerProductTab(ext: ProductTabExtension): void {
  if (productTabExtensions.some((e) => e.id === ext.id)) return;
  productTabExtensions.push(ext);
}

export function getRegisteredProductTabs(): ProductTabExtension[] {
  return productTabExtensions;
}

// ---------------------------------------------------------------------------
// Product save hooks — módulos registran acciones que se ejecutan al guardar
// Se llaman con el productId definitivo (post-create o post-update).
// ---------------------------------------------------------------------------

type ProductSaveHook = (
  productId: number,
  businessUnitId: number,
  isCreating: boolean
) => Promise<void>;

const productSaveHooks: ProductSaveHook[] = [];

export function registerProductSaveHook(hook: ProductSaveHook): void {
  productSaveHooks.push(hook);
}

export function getProductSaveHooks(): ProductSaveHook[] {
  return productSaveHooks;
}

const productExtensions: ProductExtension[] = [];

export function registerProductExtension(ext: ProductExtension): void {
  // Guard against duplicate registration (HMR re-runs module-level code)
  if (productExtensions.some((e) => e.name === ext.name)) return;
  productExtensions.push(ext);
}

export function useProductExtensions(): ProductExtension[] {
  return productExtensions;
}

// ---------------------------------------------------------------------------
// Sale extensions — módulos registran datos adicionales en ventas
// ---------------------------------------------------------------------------

export interface SaleExtension {
  name: string;
  component: ComponentType<{ saleId: number }>;
}

const saleExtensions: SaleExtension[] = [];

export function registerSaleExtension(ext: SaleExtension): void {
  saleExtensions.push(ext);
}

export function useSaleExtensions(): SaleExtension[] {
  return saleExtensions;
}

// ---------------------------------------------------------------------------
// Screen registry — módulos registran pantallas propias en el router
// ---------------------------------------------------------------------------

export interface ScreenDefinition {
  path: string;
  name: string;
  component: ComponentType;
}

const customScreens: ScreenDefinition[] = [];

export function registerScreen(screen: ScreenDefinition): void {
  customScreens.push(screen);
}

export function getRegisteredScreens(): ScreenDefinition[] {
  return customScreens;
}

// ---------------------------------------------------------------------------
// Report registry — módulos registran reportes adicionales
// ---------------------------------------------------------------------------

export interface ReportDefinition {
  id: string;
  name: string;
  component: ComponentType;
  /** Si se especifica, el reporte solo aparece en BUs con ese módulo activo */
  moduleId?: string;
}

const customReports: ReportDefinition[] = [];

export function registerReport(report: ReportDefinition): void {
  customReports.push(report);
}

export function getRegisteredReports(): ReportDefinition[] {
  return customReports;
}

// ---------------------------------------------------------------------------
// Menu item registry — módulos registran ítems en el menú lateral
// ---------------------------------------------------------------------------

export interface MenuItemDefinition {
  id: string;
  label: string;
  path: string;
  moduleId: string;
  icon?: string;
}

const menuItems: MenuItemDefinition[] = [];

export function registerMenuItem(item: MenuItemDefinition): void {
  menuItems.push(item);
}

export function getRegisteredMenuItems(): MenuItemDefinition[] {
  return menuItems;
}

// ---------------------------------------------------------------------------
// POS product interceptors — módulos interceptan la selección de un producto
// Retornar true indica que el módulo manejó el item (no llamar addToCart default)
// ---------------------------------------------------------------------------

type POSProductInterceptor = (
  product: Product,
  addToCart: (item: Omit<CartItem, 'lineTotal'>) => void,
  businessUnitId: number,
) => boolean;

const posProductInterceptors: POSProductInterceptor[] = [];

export function registerPOSProductInterceptor(fn: POSProductInterceptor): void {
  if (posProductInterceptors.includes(fn)) return;
  posProductInterceptors.push(fn);
}

export function getPOSProductInterceptors(): POSProductInterceptor[] {
  return posProductInterceptors;
}

// ---------------------------------------------------------------------------
// POS overlay components — módulos registran componentes que se renderizan
// encima del POS (ej. VariantSelectorOverlay)
// ---------------------------------------------------------------------------

const posOverlayComponents: ComponentType[] = [];

export function registerPOSOverlayComponent(component: ComponentType): void {
  if (posOverlayComponents.includes(component)) return;
  posOverlayComponents.push(component);
}

export function getPOSOverlayComponents(): ComponentType[] {
  return posOverlayComponents;
}
