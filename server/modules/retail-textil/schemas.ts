import { z } from 'zod';

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
