import { Router } from 'express';
import { installationRouter } from './routes/installation.routes';
import { businessUnitRouter } from './routes/businessUnit.routes';

export function createCoreRouter(): Router {
  const router = Router();
  router.use('/api', installationRouter);
  router.use('/api', businessUnitRouter);
  return router;
}
