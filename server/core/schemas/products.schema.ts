import { z } from 'zod';

const baseProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
  description: z.union([z.string().max(1000), z.literal('')]).optional(),
  category: z.union([z.string().max(100), z.literal('')]).optional(),
  sku: z.string().min(1, 'El SKU es obligatorio').max(100),
  costPrice: z.number().min(0, 'El costo debe ser positivo'),
  basePrice: z.number().min(0, 'El precio debe ser positivo'),
  taxRate: z.number().min(0).max(100).optional().default(21),
  // retail-textil optional fields
  code:               z.string().max(100).nullable().optional(),
  showInCatalog:      z.boolean().optional(),
  catalogDescription: z.string().max(2000).nullable().optional(),
  // identificadores adicionales
  barcode:      z.string().max(100).nullable().optional(),
  supplierCode: z.string().max(100).nullable().optional(),
});

export const createProductSchema = baseProductSchema.refine(
  (data) => data.costPrice < data.basePrice,
  {
    message: 'El costo debe ser menor al precio de venta',
    path: ['costPrice'],
  }
);

export const updateProductSchema = baseProductSchema
  .partial()
  .refine((data) => (data.costPrice && data.basePrice ? data.costPrice < data.basePrice : true), {
    message: 'El costo debe ser menor al precio de venta',
    path: ['costPrice'],
  });

export const adjustStockSchema = z.object({
  quantity: z.number().refine((val) => val !== 0, 'La cantidad debe ser distinto a 0'),
  reason: z
    .string()
    .min(5, 'La razón debe tener al menos 5 caracteres')
    .max(500, 'La razón no puede exceder 500 caracteres'),
});

export type CreateProductRequest = z.infer<typeof createProductSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductSchema>;
export type AdjustStockRequest = z.infer<typeof adjustStockSchema>;
