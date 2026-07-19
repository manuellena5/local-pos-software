import type { Request, Response, NextFunction } from 'express';
import { productVariantService } from '../services/ProductVariantService';
import { upsertVariantsSchema } from '../schemas';
import { ZodError } from 'zod';

export class ProductVariantController {
  getByProduct(req: Request, res: Response, next: NextFunction): void {
    try {
      const productId = Number(req.params['productId']);
      const variants = productVariantService.getVariants(productId);
      res.json({ data: variants, error: null });
    } catch (err) {
      next(err);
    }
  }

  upsert(req: Request, res: Response, next: NextFunction): void {
    try {
      const productId = Number(req.params['productId']);
      const businessUnitId = Number(req.query['businessUnitId']);

      const parsed = upsertVariantsSchema.parse(req.body);
      const variants = productVariantService.upsertVariants(
        productId,
        businessUnitId,
        parsed.attributeType,
        parsed.variants,
      );
      res.json({ data: variants, error: null });
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: err.errors.map((e) => e.message).join(', ') } });
        return;
      }
      next(err);
    }
  }

  archive(req: Request, res: Response, next: NextFunction): void {
    try {
      const variantId = Number(req.params['variantId']);
      productVariantService.archiveVariant(variantId);
      res.json({ data: { success: true }, error: null });
    } catch (err) {
      next(err);
    }
  }

  delete(req: Request, res: Response, next: NextFunction): void {
    try {
      const variantId = Number(req.params['variantId']);
      productVariantService.deleteVariant(variantId);
      res.json({ data: { success: true }, error: null });
    } catch (err) {
      next(err);
    }
  }
}

export const productVariantController = new ProductVariantController();
