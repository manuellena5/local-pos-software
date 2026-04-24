import { z } from 'zod';
import { MODULE_IDS } from '../../../shared/constants';

export const createBusinessUnitSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  moduleId: z.enum([MODULE_IDS.RETAIL_GENERAL, MODULE_IDS.RETAIL_TEXTIL, MODULE_IDS.TALLER_MEDIDA]),
  invoicePrefix: z.string().length(1, 'El prefijo debe ser un solo carácter').default('A'),
});

export const updateBusinessUnitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  invoicePrefix: z.string().length(1).optional(),
});

export type CreateBusinessUnitDto = z.infer<typeof createBusinessUnitSchema>;
export type UpdateBusinessUnitDto = z.infer<typeof updateBusinessUnitSchema>;
