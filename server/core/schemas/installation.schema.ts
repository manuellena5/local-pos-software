import { z } from 'zod';

export const updateInstallationSchema = z.object({
  businessName:           z.string().min(1, 'El nombre del negocio es obligatorio').max(100).optional(),
  cuit:                   z.string().max(20).optional(),
  address:                z.string().max(200).optional(),
  addressStreet:          z.string().max(200).nullable().optional(),
  addressCity:            z.string().max(200).nullable().optional(),
  ingBrutos:              z.string().max(50).optional(),
  fiscalCondition:        z.enum(['monotributo', 'responsable_inscripto']).optional(),
  logoPath:               z.string().nullable().optional(),
  whatsappNumber:         z.string().max(30).nullable().optional(),
  catalogBusinessUnitId:  z.number().int().positive().nullable().optional(),
});

export type UpdateInstallationDto = z.infer<typeof updateInstallationSchema>;
