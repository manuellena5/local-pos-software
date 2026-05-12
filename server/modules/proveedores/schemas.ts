import { z } from 'zod';

const PAYMENT_TERMS = ['contado', '15dias', '30dias', '60dias', 'otro'] as const;

export const createSupplierSchema = z.object({
  businessUnitId: z.number().int().positive('businessUnitId inválido'),
  name:           z.string().min(1, 'El nombre es obligatorio').max(200).trim(),
  contactName:    z.string().max(200).trim().optional().nullable(),
  phone:          z.string().max(50).trim().optional().nullable(),
  email:          z.string().email('Email inválido').max(200).trim().optional().nullable().or(z.literal('')),
  paymentTerms:   z.enum(PAYMENT_TERMS).optional().nullable(),
  deliveryDays:   z.number().int().min(0).optional().nullable(),
  notes:          z.string().max(2000).trim().optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial().omit({ businessUnitId: true });

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
