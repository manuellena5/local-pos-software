/**
 * API pública de solo lectura para catálogo web.
 * CORS abierto — diseñada para ser consumida desde cualquier origen.
 *
 * GET /api/public/catalog/:businessUnitId/products
 * GET /api/public/catalog/:businessUnitId/products/:id
 * GET /api/public/sync/status
 * GET /api/public/config
 */

import { Router, type Request, type Response } from 'express';
import cors from 'cors';
import { db, sqlite } from '../../db/connection';
import { products, stockItems, productAttributes, productImages } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import { getDisplayPrice } from '../services/pricing.utils';
import { syncService } from '../services/SyncService';

export const publicRouter = Router();

publicRouter.use(cors({ origin: '*' }));

type CatalogRow = {
  id: number;
  name: string;
  description: string | null;
  catalog_description: string | null;
  category: string | null;
  sku: string;
  code: string | null;
  base_price: number;
  tax_rate: number;
  show_in_catalog: number;
  stock_qty: number | null;
  stock_threshold: number | null;
};

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

    const search        = String(req.query['search'] ?? '');
    const category      = String(req.query['category'] ?? '');
    const onlyAvailable = req.query['available'] === 'true';

    // Usamos SQLite directo para incluir columnas aditivas (code, show_in_catalog, catalog_description)
    let sql = `
      SELECT p.id, p.name, p.description, p.category, p.sku, p.base_price, p.tax_rate,
             p.code, p.show_in_catalog, p.catalog_description,
             s.quantity AS stock_qty, s.minimum_threshold AS stock_threshold
      FROM products p
      LEFT JOIN stock_items s ON s.product_id = p.id
      WHERE p.business_unit_id = ? AND p.is_active = 1 AND p.show_in_catalog = 1
    `;
    const params: unknown[] = [buId];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (category) {
      sql += ` AND p.category = ?`;
      params.push(category);
    }

    const rows = sqlite.prepare(sql).all(...params) as CatalogRow[];

    const data = rows
      .map((r) => {
        const status = stockStatus(r.stock_qty ?? 0, r.stock_threshold ?? 5);
        if (onlyAvailable && status === 'out') return null;

        const primaryImg = db
          .select({ filePath: productImages.filePath })
          .from(productImages)
          .where(and(eq(productImages.productId, r.id), eq(productImages.isPrimary, true)))
          .get();

        const attrs = db
          .select({ key: productAttributes.key, value: productAttributes.value })
          .from(productAttributes)
          .where(eq(productAttributes.productId, r.id))
          .orderBy(productAttributes.sortOrder)
          .all();

        return {
          id:                 r.id,
          name:               r.name,
          description:        r.description ?? null,
          catalogDescription: r.catalog_description ?? null,
          category:           r.category ?? null,
          sku:                r.sku,
          code:               r.code ?? null,
          displayPrice:       getDisplayPrice(r.base_price, r.tax_rate),
          stockStatus:        status,
          primaryImage:       primaryImg?.filePath ?? null,
          attributes:         attrs,
        };
      })
      .filter(Boolean);

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
        id:             products.id,
        name:           products.name,
        description:    products.description,
        category:       products.category,
        sku:            products.sku,
        taxRate:        products.taxRate,
        basePrice:      products.basePrice,
        isActive:       products.isActive,
        stockQty:       stockItems.quantity,
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

    const primaryImg = db
      .select({ filePath: productImages.filePath })
      .from(productImages)
      .where(and(eq(productImages.productId, id), eq(productImages.isPrimary, true)))
      .get();

    const allImages = db
      .select({ id: productImages.id, filePath: productImages.filePath, altText: productImages.altText, isPrimary: productImages.isPrimary })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(productImages.sortOrder)
      .all();

    const attrs = db
      .select({ key: productAttributes.key, value: productAttributes.value })
      .from(productAttributes)
      .where(eq(productAttributes.productId, id))
      .orderBy(productAttributes.sortOrder)
      .all();

    const extra = sqlite
      .prepare('SELECT code, catalog_description FROM products WHERE id = ?')
      .get(id) as { code: string | null; catalog_description: string | null } | undefined;

    res.json({
      data: {
        id:                 row.id,
        name:               row.name,
        description:        row.description ?? null,
        catalogDescription: extra?.catalog_description ?? null,
        category:           row.category ?? null,
        sku:                row.sku,
        code:               extra?.code ?? null,
        displayPrice:       getDisplayPrice(row.basePrice, row.taxRate),
        stockStatus:        stockStatus(row.stockQty ?? 0, row.stockThreshold ?? 5),
        primaryImage:       primaryImg?.filePath ?? null,
        images:             allImages,
        attributes:         attrs,
      },
      error: null,
    });
  },
);

// GET /api/public/sync/status
publicRouter.get('/sync/status', (_req: Request, res: Response) => {
  const pending = syncService.countPending();
  const logs    = syncService.getRecentLogs().slice(-5).map((l) => ({
    status:     l.status,
    synced:     l.synced,
    failed:     l.failed,
    durationMs: l.durationMs,
    createdAt:  l.createdAt,
  }));
  res.json({ data: { pendingItems: pending, recentLogs: logs }, error: null });
});

// GET /api/public/config — datos del negocio para el catálogo web (sin datos sensibles)
publicRouter.get('/config', (_req: Request, res: Response) => {
  const row = sqlite
    .prepare('SELECT business_name, logo_path, whatsapp_number, catalog_business_unit_id FROM installation_config LIMIT 1')
    .get() as { business_name: string; logo_path: string | null; whatsapp_number: string | null; catalog_business_unit_id: number | null } | undefined;

  if (!row) {
    res.json({ data: null, error: null });
    return;
  }
  res.json({
    data: {
      businessName:          row.business_name,
      logoPath:              row.logo_path,
      whatsappNumber:        row.whatsapp_number,
      catalogBusinessUnitId: row.catalog_business_unit_id,
    },
    error: null,
  });
});
