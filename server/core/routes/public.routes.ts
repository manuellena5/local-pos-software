/**
 * API pública de solo lectura para catálogo web.
 * CORS abierto — diseñada para ser consumida desde cualquier origen.
 *
 * GET /api/public/catalog/:businessUnitId/products
 * GET /api/public/catalog/:businessUnitId/products/:id
 * GET /api/public/sync/status  (estado de sincronización, sin datos sensibles)
 */

import { Router, type Request, type Response } from 'express';
import cors from 'cors';
import { db } from '../../db/connection';
import { products, stockItems } from '../../db/schema';
import { and, eq, like, or } from 'drizzle-orm';
import { getDisplayPrice } from '../services/pricing.utils';
import { syncService } from '../services/SyncService';

export const publicRouter = Router();

// CORS abierto para la API pública
publicRouter.use(cors({ origin: '*' }));

/** Convierte cantidad → estado legible */
function stockStatus(qty: number, threshold: number): 'ok' | 'low' | 'out' {
  if (qty === 0) return 'out';
  if (qty <= threshold) return 'low';
  return 'ok';
}

// GET /api/public/catalog/:businessUnitId/products
publicRouter.get(
  '/catalog/:businessUnitId/products',
  (req: Request, res: Response) => {
    const buId = Number(req.params['businessUnitId']);
    if (isNaN(buId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_BU', message: 'businessUnitId inválido' } });
      return;
    }

    const search  = String(req.query['search'] ?? '');
    const category = String(req.query['category'] ?? '');

    const query = db
      .select({
        id:          products.id,
        name:        products.name,
        description: products.description,
        category:    products.category,
        sku:         products.sku,
        taxRate:     products.taxRate,
        basePrice:   products.basePrice,
        isActive:    products.isActive,
        stockQty:    stockItems.quantity,
        stockThreshold: stockItems.minimumThreshold,
      })
      .from(products)
      .leftJoin(stockItems, eq(stockItems.productId, products.id))
      .where(
        and(
          eq(products.businessUnitId, buId),
          eq(products.isActive, true),
          search
            ? or(
                like(products.name, `%${search}%`),
                like(products.sku, `%${search}%`),
                like(products.category, `%${search}%`),
              )
            : undefined,
          category ? eq(products.category, category) : undefined,
        ),
      );

    const rows = query.all();

    const data = rows.map((r) => ({
      id:           r.id,
      name:         r.name,
      description:  r.description ?? null,
      category:     r.category ?? null,
      sku:          r.sku,
      displayPrice: getDisplayPrice(r.basePrice, r.taxRate),
      stockStatus:  stockStatus(r.stockQty ?? 0, r.stockThreshold ?? 5),
      // NO incluye: costPrice, basePrice (precio sin IVA interno)
    }));

    res.json({ data, error: null });
  },
);

// GET /api/public/catalog/:businessUnitId/products/:id
publicRouter.get(
  '/catalog/:businessUnitId/products/:id',
  (req: Request, res: Response) => {
    const buId = Number(req.params['businessUnitId']);
    const id   = Number(req.params['id']);

    if (isNaN(buId) || isNaN(id)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'Parámetros inválidos' } });
      return;
    }

    const row = db
      .select({
        id:          products.id,
        name:        products.name,
        description: products.description,
        category:    products.category,
        sku:         products.sku,
        taxRate:     products.taxRate,
        basePrice:   products.basePrice,
        isActive:    products.isActive,
        stockQty:    stockItems.quantity,
        stockThreshold: stockItems.minimumThreshold,
      })
      .from(products)
      .leftJoin(stockItems, eq(stockItems.productId, products.id))
      .where(and(eq(products.id, id), eq(products.businessUnitId, buId), eq(products.isActive, true)))
      .get();

    if (!row) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } });
      return;
    }

    res.json({
      data: {
        id:           row.id,
        name:         row.name,
        description:  row.description ?? null,
        category:     row.category ?? null,
        sku:          row.sku,
        displayPrice: getDisplayPrice(row.basePrice, row.taxRate),
        stockStatus:  stockStatus(row.stockQty ?? 0, row.stockThreshold ?? 5),
      },
      error: null,
    });
  },
);

// GET /api/public/sync/status — estado de sync (sin datos sensibles)
// También montado en /api/sync/trigger (POST) desde el router principal
publicRouter.get('/sync/status', (_req: Request, res: Response) => {
  const pending = syncService.countPending();
  const logs    = syncService.getRecentLogs().slice(-5).map((l) => ({
    status:     l.status,
    synced:     l.synced,
    failed:     l.failed,
    durationMs: l.durationMs,
    createdAt:  l.createdAt,
  }));

  res.json({
    data: {
      pendingItems: pending,
      recentLogs:   logs,
    },
    error: null,
  });
});
