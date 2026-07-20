import type { Request, Response, NextFunction } from 'express';
import { setPaymentMethodActiveSchema } from '../schemas/paymentMethods.schema';
import { ValidationError } from '../../lib/errors';
import type { PaymentMethodService } from '../services/PaymentMethodService';

export class PaymentMethodController {
  constructor(private readonly service: PaymentMethodService) {}

  list = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = this.service.list();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  listActive = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = this.service.listActive();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  setActive = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      const parsed = setPaymentMethodActiveSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
      }
      const data = this.service.setActive(id, parsed.data.isActive);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };
}
