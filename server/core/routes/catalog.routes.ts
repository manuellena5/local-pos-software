/**
 * Sirve el catálogo web en GET /catalog
 * Es una SPA vanilla HTML/JS que consume /api/public/catalog/:buId/products
 */
import path from 'path';
import fs from 'fs';
import { Router, type Request, type Response } from 'express';
import cors from 'cors';

export const catalogRouter = Router();

catalogRouter.use(cors({ origin: '*' }));

catalogRouter.get('/catalog', (_req: Request, res: Response) => {
  const htmlPath = path.join(process.cwd(), 'assets', 'catalog', 'index.html');
  if (!fs.existsSync(htmlPath)) {
    res.status(404).send('Catálogo web no encontrado. Revisar assets/catalog/index.html');
    return;
  }
  res.sendFile(htmlPath);
});
