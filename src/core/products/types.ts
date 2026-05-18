import type { ProductWithStock } from '@shared/types';

export type ColumnId =
  | 'name'
  | 'category'
  | 'cost'
  | 'price'
  | 'margin'
  | 'stock'
  | 'lastSupplier'
  | 'actions'
  | 'barcode'
  | 'supplierCode'
  | 'priceNet'
  | 'ivaRate'
  | 'lastPurchaseDate';

export interface ColumnConfig {
  id: ColumnId;
  label: string;
  defaultVisible: boolean;
  alwaysVisible: boolean;
}

export const ALL_COLUMNS: ColumnConfig[] = [
  { id: 'name',             label: 'Producto',            defaultVisible: true,  alwaysVisible: true  },
  { id: 'category',         label: 'Categoría',           defaultVisible: true,  alwaysVisible: false },
  { id: 'cost',             label: 'Costo',               defaultVisible: true,  alwaysVisible: false },
  { id: 'price',            label: 'Precio c/IVA',        defaultVisible: true,  alwaysVisible: false },
  { id: 'margin',           label: 'Margen %',            defaultVisible: true,  alwaysVisible: false },
  { id: 'stock',            label: 'Stock',               defaultVisible: true,  alwaysVisible: false },
  { id: 'lastSupplier',     label: 'Último proveedor',    defaultVisible: true,  alwaysVisible: false },
  { id: 'actions',          label: 'Acciones',            defaultVisible: true,  alwaysVisible: true  },
  { id: 'barcode',          label: 'Código de barras',    defaultVisible: false, alwaysVisible: false },
  { id: 'supplierCode',     label: 'Código proveedor',    defaultVisible: false, alwaysVisible: false },
  { id: 'priceNet',         label: 'Precio s/IVA',        defaultVisible: false, alwaysVisible: false },
  { id: 'ivaRate',          label: 'Alícuota IVA',        defaultVisible: false, alwaysVisible: false },
  { id: 'lastPurchaseDate', label: 'Última compra',       defaultVisible: false, alwaysVisible: false },
];

export type ChipFilter = 'all' | 'low' | 'nocost' | 'instock';

export interface ProductsFilter {
  search: string;
  category: string;
  stockFilter: 'all' | 'instock' | 'low' | 'out';
  showArchived: boolean;
  chip: ChipFilter;
}

export type ProductModalTab = 'base' | 'precios' | 'atributos' | 'catalogo' | 'estadisticas';

export type InlineEditField = 'cost' | 'price' | 'margin';

export interface InlineEditState {
  productId: number;
  field: InlineEditField;
  value: string;
}

export interface CategoryAttributes {
  [attrName: string]: string[];
}

export const CATEGORY_ATTRIBUTES: Record<string, CategoryAttributes> = {
  Blanquería: {
    'Tamaño / Medidas':      [],
    'Material / Composición': [],
    'Color':                  [],
    'Hilos / Calidad':        [],
  },
  Aromas: {
    'Fragancia':  [],
    'Formato':    [],
    'Volumen':    [],
    'Color':      [],
  },
  Deco: {
    'Material':   [],
    'Estilo':     [],
    'Color':      [],
    'Dimensiones': [],
  },
  Textil: {
    'Talla':      [],
    'Color':      [],
    'Material':   [],
    'Género':     [],
  },
};

export type StatPeriod = '30d' | '90d' | 'year' | 'all';

export interface ProductsChipCounts {
  all: number;
  low: number;
  nocost: number;
  instock: number;
}

export function computeChipCounts(products: ProductWithStock[]): ProductsChipCounts {
  return {
    all:     products.length,
    low:     products.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumThreshold).length,
    nocost:  products.filter(p => !p.costPrice || p.costPrice === 0).length,
    instock: products.filter(p => p.currentStock > 0).length,
  };
}

export function filterByChip(products: ProductWithStock[], chip: ChipFilter): ProductWithStock[] {
  switch (chip) {
    case 'low':     return products.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumThreshold);
    case 'nocost':  return products.filter(p => !p.costPrice || p.costPrice === 0);
    case 'instock': return products.filter(p => p.currentStock > 0);
    default:        return products;
  }
}

/** precioSinIVA = costo * (1 + margen/100) */
export function calcPriceNet(cost: number, marginPct: number): number {
  return Math.round(cost * (1 + marginPct / 100) * 100) / 100;
}

/** precioConIVA = precioSinIVA * (1 + iva/100) */
export function calcPriceGross(priceNet: number, taxRate: number): number {
  return Math.round(priceNet * (1 + taxRate / 100) * 100) / 100;
}

/** margen = (precioSinIVA - costo) / costo * 100 */
export function calcMargin(cost: number, priceNet: number): number {
  if (cost === 0) return 0;
  return Math.round(((priceNet - cost) / cost) * 10000) / 100;
}

/** precioSinIVA = precioConIVA / (1 + iva/100) */
export function calcPriceNetFromGross(priceGross: number, taxRate: number): number {
  if (taxRate === 0) return priceGross;
  return Math.round((priceGross / (1 + taxRate / 100)) * 100) / 100;
}
