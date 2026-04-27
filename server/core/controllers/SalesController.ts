import type { Request, Response, NextFunction } from 'express';
import type { SalesService } from '../services/SalesService';
import { ValidationError } from '../../lib/errors';

export class SalesController {
  constructor(private readonly service: SalesService) {}

  getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const sales = this.service.getAllSales(businessUnitId);
      res.json({ data: sales, error: null });
    } catch (err) {
      next(err);
    }
  }

  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de venta inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const result = this.service.getSaleWithItems(id, businessUnitId);
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  }

  confirm(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId ?? req.body.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const { items, discountPercent, discountAmount, paymentMethods, userId } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Se requiere al menos un item en el carrito');
      }
      if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
        throw new ValidationError('Se requiere al menos un medio de pago');
      }

      const result = this.service.confirmSale({
        businessUnitId,
        userId: userId ? Number(userId) : undefined,
        items,
        discountPercent: discountPercent ? Number(discountPercent) : 0,
        discountAmount: discountAmount ? Number(discountAmount) : 0,
        paymentMethods,
      });

      res.status(201).json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  }
}
