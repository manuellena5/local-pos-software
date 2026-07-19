import { Router } from 'express';
import { productVariantController } from '../controllers/ProductVariantController';

export const productVariantsRouter = Router();

// GET    /api/modules/retail-textil/products/:productId/variants
productVariantsRouter.get(
  '/products/:productId/variants',
  (req, res, next) => productVariantController.getByProduct(req, res, next),
);

// PUT    /api/modules/retail-textil/products/:productId/variants?businessUnitId=N
productVariantsRouter.put(
  '/products/:productId/variants',
  (req, res, next) => productVariantController.upsert(req, res, next),
);

// DELETE /api/modules/retail-textil/variants/:variantId/archive
productVariantsRouter.post(
  '/variants/:variantId/archive',
  (req, res, next) => productVariantController.archive(req, res, next),
);

// DELETE /api/modules/retail-textil/variants/:variantId
productVariantsRouter.delete(
  '/variants/:variantId',
  (req, res, next) => productVariantController.delete(req, res, next),
);
