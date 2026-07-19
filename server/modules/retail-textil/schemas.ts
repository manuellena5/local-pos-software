import { z } from 'zod';

// ── Variantes ───────────────────────────────────────────────────────────────

export const variantInputSchema = z.object({
  id:             z.number().int().positive().optional(),
  attributeValue: z.string().min(1, 'El valor del atributo es obligatorio').max(200),
  price:          z.number().positive('El precio debe ser mayor a 0'),
  costPrice:      z.number().min(0),
  barcode:        z.string().max(100).nullable().optional(),
  // Sin .default(0): undefined significa "no modificar el stock" en updates
  stock:          z.number().int().min(0).optional(),
});

export const upsertVariantsSchema = z.object({
  attributeType: z.string().min(1, 'El tipo de atributo es obligatorio').max(100),
  variants:      z.array(variantInputSchema).min(1, 'Debe haber al menos una variante'),
});

export type VariantInput        = z.infer<typeof variantInputSchema>;
export type UpsertVariantsInput = z.infer<typeof upsertVariantsSchema>;

export const attributeItemSchema = z.object({
  key:       z.string().min(1, 'La clave es obligatoria').max(100),
  value:     z.string().min(1, 'El valor es obligatorio').max(500),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const upsertAttributesSchema = z.object({
  attributes: z.array(attributeItemSchema),
});

export const reorderImagesSchema = z.object({
  order: z.array(z.number().int().positive()),
});

export type UpsertAttributesInput = z.infer<typeof upsertAttributesSchema>;
export type ReorderImagesInput    = z.infer<typeof reorderImagesSchema>;
