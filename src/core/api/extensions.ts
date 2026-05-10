import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Product extensions — módulos registran campos/UI extra en formularios de producto
// ---------------------------------------------------------------------------

export interface ProductExtension {
  name: string;
  component: ComponentType<{ productId: number; businessUnitId: number }>;
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
