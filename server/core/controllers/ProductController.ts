import type { Request, Response, NextFunction } from 'express';
import type { ProductService } from '../services/ProductService';
import { createProductSchema, updateProductSchema, inlineUpdateSchema, bulkPriceUpdateSchema } from '../schemas/products.schema';
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

  getByBarcode(req: Request, res: Response, next: NextFunction): void {
    try {
      const barcode = req.params.barcode ?? '';
      const businessUnitId = Number(req.query.businessUnitId);

      if (!barcode) throw new ValidationError('Código de barras requerido');
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const item = this.service.findByBarcode(barcode, businessUnitId);
      if (!item) {
        res.json({ data: { found: false }, error: null });
        return;
      }
      res.json({ data: { found: true, item }, error: null });
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

      if (!Number.isInteger(id) || id <= 0) throw new ValidationError('ID de producto inválido');
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) throw new ValidationError('businessUnitId inválido');

      const product = this.service.toggleActive(id, businessUnitId, false);
      res.json({ data: product, error: null });
    } catch (err) {
      next(err);
    }
  }

  listWithStock(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) throw new ValidationError('businessUnitId inválido');
      res.json({ data: this.service.listAllWithStock(businessUnitId), error: null });
    } catch (err) {
      next(err);
    }
  }

  inlineUpdate(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(id) || id <= 0) throw new ValidationError('ID inválido');
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) throw new ValidationError('businessUnitId inválido');
      const parsed = inlineUpdateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Datos inválidos', parsed.error.errors);
      const product = this.service.inlineUpdate(id, businessUnitId, parsed.data);
      res.json({ data: product, error: null });
    } catch (err) {
      next(err);
    }
  }

  bulkUpdatePrices(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = bulkPriceUpdateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Datos inválidos', parsed.error.errors);
      const { businessUnitId, adjustmentType, value, categoryId } = parsed.data;
      const preview = req.query.preview === 'true';
      // categoryId is numeric but service filters by category name — pass null for now
      const result = this.service.bulkUpdatePrices(businessUnitId, adjustmentType, value, null, preview);
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  }

  getPurchaseHistory(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(id) || id <= 0) throw new ValidationError('ID inválido');
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) throw new ValidationError('businessUnitId inválido');
      res.json({ data: this.service.getPurchaseHistory(id, businessUnitId), error: null });
    } catch (err) {
      next(err);
    }
  }

  getStats(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);
      const periodDays = req.query.periodDays ? Number(req.query.periodDays) : null;
      if (!Number.isInteger(id) || id <= 0) throw new ValidationError('ID inválido');
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) throw new ValidationError('businessUnitId inválido');
      res.json({ data: this.service.getStats(id, businessUnitId, periodDays), error: null });
    } catch (err) {
      next(err);
    }
  }

  countTransactions(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(id) || id <= 0) throw new ValidationError('ID inválido');
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) throw new ValidationError('businessUnitId inválido');
      res.json({ data: { count: this.service.countTransactions(id, businessUnitId) }, error: null });
    } catch (err) {
      next(err);
    }
  }

  archive(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(id) || id <= 0) throw new ValidationError('ID inválido');
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) throw new ValidationError('businessUnitId inválido');
      res.json({ data: this.service.archive(id, businessUnitId), error: null });
    } catch (err) {
      next(err);
    }
  }
}
