/** Atributo libre de un producto (par clave-valor). */
export interface ProductAttribute {
  id: number;
  productId: number;
  key: string;
  value: string;
  sortOrder: number;
}

/** Imagen asociada a un producto. */
export interface ProductImage {
  id: number;
  productId: number;
  filePath: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: number;
}

/** Payload para crear/reemplazar atributos de un producto. */
export interface UpsertAttributesRequest {
  attributes: Array<{ key: string; value: string; sortOrder?: number }>;
}

/** Producto enriquecido para el catálogo público. */
export interface CatalogProduct {
  id: number;
  name: string;
  description: string | null;
  catalogDescription: string | null;
  category: string | null;
  sku: string;
  code: string | null;
  displayPrice: number;
  stockStatus: 'ok' | 'low' | 'out';
  primaryImage: string | null;
  attributes: Array<{ key: string; value: string }>;
}
