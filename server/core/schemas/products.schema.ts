import { z } from 'zod';

const baseProductSchema = z.object({
  name:        z.string().min(1, 'El nombre es obligatorio').max(255),
  description: z.union([z.string().max(1000), z.literal('')]).optional(),
  category:    z.string().max(100).nullable().optional().transform((v) => v ?? undefined),
  // sku ya NO viene del cliente — se genera en el backend automáticamente
  costPrice:   z.number().min(0, 'El costo debe ser positivo'),
  basePrice:   z.number().min(0, 'El precio debe ser positivo'),
  taxRate:     z.number().min(0).max(100).optional().default(21),
  // retail-textil optional fields
  code:               z.string().max(100).nullable().optional(),
  showInCatalog:      z.boolean().optional(),
  catalogDescription: z.string().max(2000).nullable().optional(),
  // identificadores adicionales
  barcode:      z.string().max(100).nullable().optional(),
  supplierCode: z.string().max(100).nullable().optional(),
  // campos extendidos
  minimumSalePrice: z.number().min(0).nullable().optional(),
  supplierId:       z.number().int().positive().nullable().optional(),
  supplierLeadTime: z.number().int().min(0).nullable().optional(),
  showCatalogPrice: z.boolean().optional(),
  showCatalogStock: z.boolean().optional(),
});

// No validamos costPrice < basePrice porque basePrice es precio NETO (sin IVA).
// Un producto con costo 100 y precio neto 95 (bruto 114.95) es perfectamente válido.
export const createProductSchema = baseProductSchema;

export const updateProductSchema = baseProductSchema.partial();

export const adjustStockSchema = z.object({
  quantity: z.number().refine((val) => val !== 0, 'La cantidad debe ser distinto a 0'),
  reason: z
    .string()
    .min(5, 'La razón debe tener al menos 5 caracteres')
    .max(500, 'La razón no puede exceder 500 caracteres'),
});

export const createStockMovementSchema = z.object({
  type:     z.enum(['entrada', 'salida', 'ajuste']),
  quantity: z.number().int().positive('La cantidad debe ser un entero positivo'),
  unitCost: z.number().min(0).optional(),
  reason:   z.string().max(500).optional(),
});

export const inlineUpdateSchema = z.object({
  costPrice: z.number().min(0).optional(),
  basePrice: z.number().min(0).optional(),
  margin:    z.number().optional(),
});

export const bulkPriceUpdateSchema = z.object({
  categoryId:     z.number().int().positive().nullable().optional(),
  adjustmentType: z.enum(['increase_price_pct', 'increase_cost_pct', 'set_margin_pct']),
  value:          z.number().refine((v) => v > 0, 'El valor debe ser mayor a 0'),
  businessUnitId: z.number().int().positive(),
});

export type CreateProductRequest    = z.infer<typeof createProductSchema>;
export type UpdateProductRequest    = z.infer<typeof updateProductSchema>;
export type AdjustStockRequest      = z.infer<typeof adjustStockSchema>;
export type CreateStockMovementRequest = z.infer<typeof createStockMovementSchema>;
export type InlineUpdateRequest     = z.infer<typeof inlineUpdateSchema>;
export type BulkPriceUpdateRequest  = z.infer<typeof bulkPriceUpdateSchema>;
