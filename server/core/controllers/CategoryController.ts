import type { Request, Response, NextFunction } from 'express';
import { createCategorySchema, updateCategorySchema } from '../schemas/categories.schema';
import { ValidationError } from '../../lib/errors';
import type { CategoryService } from '../services/CategoryService';

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  list = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const buId = parseInt(req.query['buId'] as string, 10);
      if (isNaN(buId)) {
        res.status(400).json({ data: null, error: 'buId requerido' });
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
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
      }
      const data = this.service.create(parsed.data.name, parsed.data.businessUnitId);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  update = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
      }
      const data = this.service.update(id, parsed.data.name);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  delete = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      this.service.delete(id);
      res.json({ data: { deleted: true }, error: null });
    } catch (err) {
      next(err);
    }
  };
}
