import { z } from 'zod';

export const setPaymentMethodActiveSchema = z.object({
  isActive: z.boolean(),
});

export type SetPaymentMethodActiveRequest = z.infer<typeof setPaymentMethodActiveSchema>;
