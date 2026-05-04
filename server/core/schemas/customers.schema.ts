import { z } from 'zod';

// Helper: acepta string | null | undefined, convierte null/"" → undefined
const optStr = (max: number) =>
  z.string().max(max).nullable().optional().transform((v) => (v == null || v === '' ? undefined : v));

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
  documentType: z.enum(['DNI', 'CUIT', 'PASAPORTE']).nullable().optional().transform((v) => v ?? undefined),
  document: optStr(50),
  email: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .transform((v) => (v == null || v === '' ? undefined : v))
    .pipe(z.string().email('Email inválido').optional()),
  phone: optStr(20),
  address: optStr(500),
  locality: optStr(100),
  province: optStr(100),
  notes: optStr(1000),
  creditLimit: z.number().min(0, 'El límite de crédito no puede ser negativo').optional().default(0),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;
