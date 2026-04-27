import { Router } from 'express';
import { installationRouter } from './routes/installation.routes';
import { businessUnitRouter } from './routes/businessUnit.routes';
import { productsRouter } from './routes/products.routes';
import { stockRouter } from './routes/stock.routes';
import { salesRouter } from './routes/sales.routes';

export function createCoreRouter(): Router {
  const router = Router();
  router.use('/api', installationRouter);
  router.use('/api', businessUnitRouter);
  router.use('/api', productsRouter);
  router.use('/api', stockRouter);
  router.use('/api', salesRouter);
  return router;
}
