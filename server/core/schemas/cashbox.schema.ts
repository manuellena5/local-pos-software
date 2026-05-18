import { z } from 'zod';

export const createCashMovementSchema = z.object({
  type: z.enum(['opening', 'sale', 'refund', 'deposit', 'withdrawal', 'other'], {
    errorMap: () => ({ message: 'Tipo de movimiento inválido' }),
  }),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres').max(500),
  saleId: z.number().int().positive().optional(),
});

export const createCashAuditSchema = z.object({
  realBalance: z.number().min(0, 'El balance real no puede ser negativo'),
  notes: z.string().max(1000).optional(),
});

export const openSessionSchema = z.object({
  initialAmount: z.number().min(0, 'El monto inicial no puede ser negativo'),
});

export type CreateCashMovementRequest = z.infer<typeof createCashMovementSchema>;
export type CreateCashAuditRequest = z.infer<typeof createCashAuditSchema>;
export type OpenSessionRequest = z.infer<typeof openSessionSchema>;
