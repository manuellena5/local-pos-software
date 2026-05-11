import type { Request, Response } from 'express';
import { orderService } from '../services/OrderService';
import { createOrderSchema, updateStatusSchema, addPaymentSchema } from '../schemas';
import { ValidationError } from '../../../lib/errors';
import type { OrderStatus } from '../../../../shared/types/taller-medida';

export class OrderController {
  list(req: Request, res: Response): void {
    const buId = Number(req.query['buId']);
    if (isNaN(buId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'buId requerido' } });
      return;
    }
    const status = req.query['status'] as OrderStatus | undefined;
    const data = orderService.list(buId, status);
    res.json({ data, error: null });
  }

  get(req: Request, res: Response): void {
    const id = Number(req.params['id']);
    if (isNaN(id)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'id inválido' } });
      return;
    }
    const data = orderService.get(id);
    res.json({ data, error: null });
  }

  create(req: Request, res: Response): void {
    const buId = Number(req.query['buId'] ?? req.body.buId);
    if (isNaN(buId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'buId requerido' } });
      return;
    }
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten());
    }
    const data = orderService.create(buId, parsed.data);
    res.status(201).json({ data, error: null });
  }

  updateStatus(req: Request, res: Response): void {
    const id = Number(req.params['id']);
    if (isNaN(id)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'id inválido' } });
      return;
    }
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Estado inválido', parsed.error.flatten());
    }
    const data = orderService.updateStatus(id, parsed.data);
    res.json({ data, error: null });
  }

  addPayment(req: Request, res: Response): void {
    const id = Number(req.params['id']);
    if (isNaN(id)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'id inválido' } });
      return;
    }
    const parsed = addPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Datos de pago inválidos', parsed.error.flatten());
    }
    const data = orderService.addPayment(id, parsed.data);
    res.status(201).json({ data, error: null });
  }
}

export const orderController = new OrderController();
