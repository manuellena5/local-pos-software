import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_TYPES } from '../../../shared/types/taller-medida';

export const paymentSchema = z.object({
  amount:      z.number().positive({ message: 'El monto debe ser mayor a 0' }),
  paymentType: z.enum(PAYMENT_TYPES),
  notes:       z.string().max(500).optional(),
});

export const createOrderSchema = z.object({
  customerId:        z.number().int().positive().optional(),
  customerName:      z.string().min(1).max(200),
  description:       z.string().min(1).max(2000),
  totalAmount:       z.number().min(0),
  estimatedDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  notes:             z.string().max(2000).optional(),
  initialPayment:    paymentSchema.optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const addPaymentSchema = paymentSchema;

export const upsertMeasurementsSchema = z.object({
  fields: z.record(z.string(), z.string()),
});

export type CreateOrderInput      = z.infer<typeof createOrderSchema>;
export type UpdateStatusInput     = z.infer<typeof updateStatusSchema>;
export type AddPaymentInput       = z.infer<typeof addPaymentSchema>;
export type UpsertMeasurementsInput = z.infer<typeof upsertMeasurementsSchema>;
