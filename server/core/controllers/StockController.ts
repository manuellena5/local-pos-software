import type { Request, Response, NextFunction } from 'express';
import type { StockService } from '../services/StockService';
import { adjustStockSchema } from '../schemas/products.schema';
import { ValidationError } from '../../lib/errors';

export class StockController {
  constructor(private readonly service: StockService) {}

  getSummary(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const summary = this.service.getStockSummary(businessUnitId);
      res.json({ data: summary, error: null });
    } catch (err) {
      next(err);
    }
  }

  getMovements(req: Request, res: Response, next: NextFunction): void {
    try {
      const productId = Number(req.params.productId);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new ValidationError('ID de producto inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const movements = this.service.getMovementHistory(businessUnitId, { productId });
      res.json({ data: movements, error: null });
    } catch (err) {
      next(err);
    }
  }

  adjust(req: Request, res: Response, next: NextFunction): void {
    try {
      const productId = Number(req.params.productId);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new ValidationError('ID de producto inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const parsed = adjustStockSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Datos inválidos', parsed.error.errors);
      }

      const result = this.service.adjustStock(
        productId,
        businessUnitId,
        parsed.data.quantity,
        parsed.data.reason
      );

      res.status(201).json({ data: result.movement, error: null });
    } catch (err) {
      next(err);
    }
  }
}
