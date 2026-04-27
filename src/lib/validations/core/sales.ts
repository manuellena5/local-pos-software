import { z } from 'zod';

export const paymentMethodSchema = z.object({
  method: z.string().min(1, 'Medio de pago requerido'),
  amount: z.number().positive('El monto debe ser positivo'),
});

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  productName: z.string().min(1),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  discountPercent: z.number().min(0).max(100).default(0),
});

export const confirmSaleSchema = z.object({
  businessUnitId: z.number().int().positive(),
  items: z.array(cartItemSchema).min(1, 'El carrito no puede estar vacío'),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  paymentMethods: z
    .array(paymentMethodSchema)
    .min(1, 'Debe indicar al menos un medio de pago'),
});

export type ConfirmSaleInput = z.infer<typeof confirmSaleSchema>;
