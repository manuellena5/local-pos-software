import type { Request, Response, NextFunction } from 'express';
import type { ProductService } from '../services/ProductService';
import { createProductSchema, updateProductSchema } from '../schemas/products.schema';
import { ValidationError } from '../../lib/errors';

export class ProductController {
  constructor(private readonly service: ProductService) {}

  getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const search = req.query.search ? String(req.query.search) : undefined;
      const products = search
        ? this.service.search(businessUnitId, search)
        : this.service.listAll(businessUnitId);

      res.json({ data: products, error: null });
    } catch (err) {
      next(err);
    }
  }

  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de producto inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const product = this.service.getById(id, businessUnitId);
      res.json({ data: product, error: null });
    } catch (err) {
      next(err);
    }
  }

  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const parsed = createProductSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Datos inválidos', parsed.error.errors);
      }

      const product = this.service.create(businessUnitId, parsed.data);
      res.status(201).json({ data: product, error: null });
    } catch (err) {
      next(err);
    }
  }

  update(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de producto inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const parsed = updateProductSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Datos inválidos', parsed.error.errors);
      }

      const product = this.service.update(id, businessUnitId, parsed.data);
      res.json({ data: product, error: null });
    } catch (err) {
      next(err);
    }
  }

  delete(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de producto inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const product = this.service.toggleActive(id, businessUnitId, false);
      res.json({ data: product, error: null });
    } catch (err) {
      next(err);
    }
  }
}
