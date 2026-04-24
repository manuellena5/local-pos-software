import type { Request, Response, NextFunction } from 'express';
import { BusinessUnitService } from '../services/BusinessUnitService';
import {
  createBusinessUnitSchema,
  updateBusinessUnitSchema,
} from '../schemas/businessUnit.schema';
import { ValidationError } from '../../lib/errors';

export class BusinessUnitController {
  constructor(private readonly service: BusinessUnitService) {}

  getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const units = this.service.getAll();
      res.json({ data: units, error: null });
    } catch (err) {
      next(err);
    }
  }

  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = createBusinessUnitSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Datos inválidos', parsed.error.errors);
      }
      const unit = this.service.create(parsed.data);
      res.status(201).json({ data: unit, error: null });
    } catch (err) {
      next(err);
    }
  }

  update(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params['id']);
      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de unidad de negocio inválido');
      }
      const parsed = updateBusinessUnitSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Datos inválidos', parsed.error.errors);
      }
      const unit = this.service.update(id, parsed.data);
      res.json({ data: unit, error: null });
    } catch (err) {
      next(err);
    }
  }
}
