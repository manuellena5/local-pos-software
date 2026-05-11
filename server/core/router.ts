import path from 'path';
import express, { Router } from 'express';
import { installationRouter } from './routes/installation.routes';
import { businessUnitRouter } from './routes/businessUnit.routes';
import { productsRouter } from './routes/products.routes';
import { stockRouter } from './routes/stock.routes';
import { salesRouter } from './routes/sales.routes';
import { invoicesRouter } from './routes/invoices.routes';
import { customersRouter } from './routes/customers.routes';
import { cashboxRouter } from './routes/cashbox.routes';
import { reportsRouter } from './routes/reports.routes';
import { publicRouter } from './routes/public.routes';
import { catalogRouter } from './routes/catalog.routes';
import { syncService } from './services/SyncService';
import { retailTextilRouter } from '../modules/retail-textil/router';
import { tallerMedidaRouter } from '../modules/taller-medida/router';
import type { Request, Response } from 'express';

export function createCoreRouter(): Router {
  const router = Router();
  router.use('/api', installationRouter);
  router.use('/api', businessUnitRouter);
  router.use('/api', productsRouter);
  router.use('/api', stockRouter);
  router.use('/api', salesRouter);
  router.use('/api', invoicesRouter);
  router.use('/api', customersRouter);
  router.use('/api', cashboxRouter);
  router.use('/api', reportsRouter);
  // Fase 6: API pública (catálogo read-only, CORS abierto)
  router.use('/api/public', publicRouter);
  // Fase 7: Catálogo web HTML
  router.use(catalogRouter);
  // Fase 7: Módulo retail-textil
  router.use('/api/modules/retail-textil', retailTextilRouter);
  // Fase 8: Módulo taller-medida
  router.use('/api/modules/taller-medida', tallerMedidaRouter);
  // Fase 7: Servir imágenes de productos como estáticos
  router.use('/assets/products', express.static(path.join(process.cwd(), 'assets', 'products')));

  // Fase 6: Disparar sync manual desde el frontend
  router.post('/api/sync/trigger', async (_req: Request, res: Response) => {
    void syncService.syncAll().catch(() => {});
    res.json({ data: { message: 'Sync iniciado' }, error: null });
  });

  return router;
}
