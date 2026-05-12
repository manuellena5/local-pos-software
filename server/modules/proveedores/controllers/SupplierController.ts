import type { Request, Response, NextFunction } from 'express';
import { createSupplierSchema, updateSupplierSchema } from '../schemas';
import { ValidationError } from '../../../lib/errors';
import type { SupplierService } from '../services/SupplierService';

export class SupplierController {
  constructor(private readonly service: SupplierService) {}

  list = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const buId = parseInt(req.query['buId'] as string, 10);
      if (isNaN(buId)) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'buId requerido' } });
        return;
      }
      const data = this.service.listForBU(buId);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  create = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = createSupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
      }
      const data = this.service.create(parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  update = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id    = parseInt(req.params['id'] ?? '', 10);
      const buId  = parseInt((req.body as { businessUnitId?: string }).businessUnitId as string ?? req.query['buId'] as string, 10);
      const parsed = updateSupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
      }
      const data = this.service.update(id, buId, parsed.data);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  delete = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id   = parseInt(req.params['id'] ?? '', 10);
      const buId = parseInt(req.query['buId'] as string, 10);
      if (isNaN(buId)) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'buId requerido' } });
        return;
      }
      this.service.delete(id, buId);
      res.json({ data: { deleted: true }, error: null });
    } catch (err) {
      next(err);
    }
  };
}
