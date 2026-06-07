import { eq, and, like } from 'drizzle-orm';
import { db, sqlite } from '../../db/connection';
import { products } from '../../db/schema';
import type { Product, ProductWithStock, PurchaseHistoryEntry, ProductStats, ProductStat, ProductStatSale } from '../../../shared/types';
import type { CreateProductRequest, UpdateProductRequest } from '../types';
import { NotFoundError } from '../../lib/errors';
import { toSkuPart } from '../lib/skuUtils';

type ProductExtra = {
  code: string | null;
  show_in_catalog: number;
  catalog_description: string | null;
  minimum_sale_price: number | null;
  supplier_id: number | null;
  supplier_lead_time: number | null;
  show_catalog_price: number;
  show_catalog_stock: number;
};

/**
 * Enriquece un row de Drizzle con columnas aditivas que no están en el schema tipado.
 */
function enrich(raw: unknown): Product {
  const p = raw as Product;
  try {
    const extra = sqlite
      .prepare(`SELECT code, show_in_catalog, catalog_description,
                       minimum_sale_price, supplier_id, supplier_lead_time,
                       show_catalog_price, show_catalog_stock
                FROM products WHERE id = ?`)
      .get(p.id) as ProductExtra | undefined;
    if (extra) {
      return {
        ...p,
        code:               extra.code ?? null,
        showInCatalog:      Boolean(extra.show_in_catalog),
        catalogDescription: extra.catalog_description ?? null,
        minimumSalePrice:   extra.minimum_sale_price ?? null,
        supplierId:         extra.supplier_id ?? null,
        supplierLeadTime:   extra.supplier_lead_time ?? null,
        showCatalogPrice:   extra.show_catalog_price !== 0,
        showCatalogStock:   Boolean(extra.show_catalog_stock),
      };
    }
  } catch { /* columnas aún no migradas */ }
  return {
    ...p,
    code: null, showInCatalog: false, catalogDescription: null,
    minimumSalePrice: null, supplierId: null, supplierLeadTime: null,
    showCatalogPrice: true, showCatalogStock: false,
  };
}

export class ProductRepository {
  getAll(businessUnitId: number): Product[] {
    return db
      .select()
      .from(products)
      .where(and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)))
      .all()
      .map(enrich);
  }

  getById(id: number, businessUnitId: number): Product | null {
    const row = db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .limit(1)
      .all()[0];
    return row ? enrich(row) : null;
  }

  /**
   * Genera el próximo SKU disponible para una combinación categoría+producto
   * dentro de la BU. Garantiza unicidad consultando la DB y reintentando
   * si hay colisión (ej. race condition en importación masiva).
   *
   * Patrón: {CAT}-{PROD}-{NNN}
   * Ej: "Aromas" + "Home Spray" → "ARO-HOM-001"
   */
  generateSku(categoryName: string, productName: string, businessUnitId: number): string {
    const catPart  = toSkuPart(categoryName || 'GEN', 3);
    const prodPart = toSkuPart(productName  || 'PRD', 3);
    const prefix   = `${catPart}-${prodPart}`;

    // Buscar todos los SKUs existentes con ese prefijo en la BU
    type Row = { sku: string };
    const existing = sqlite
      .prepare(`SELECT sku FROM products WHERE business_unit_id = ? AND sku LIKE ? || '-%'`)
      .all(businessUnitId, prefix) as Row[];

    // Extraer los números del sufijo y tomar el máximo
    let maxNum = 0;
    for (const { sku } of existing) {
      const suffix = sku.slice(prefix.length + 1); // después del último '-'
      const n = parseInt(suffix, 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }

    // Generar el siguiente número y verificar que no colisione
    let candidate: string;
    let attempt = maxNum + 1;
    do {
      // Soporta > 999 sin truncar
      candidate = `${prefix}-${String(attempt).padStart(3, '0')}`;
      attempt++;
    } while (
      sqlite
        .prepare(`SELECT 1 FROM products WHERE business_unit_id = ? AND sku = ?`)
        .get(businessUnitId, candidate) !== undefined
    );

    return candidate;
  }

  create(businessUnitId: number, data: CreateProductRequest & { sku: string }): Product {
    const row = db
      .insert(products)
      .values({
        businessUnitId,
        name:        data.name,
        description: data.description,
        category:    data.category,
        sku:         data.sku,
        costPrice:   data.costPrice,
        basePrice:   data.basePrice,
        taxRate:     data.taxRate ?? 21,
        isActive:    true,
      })
      .returning()
      .all()[0]!;
    return enrich(row);
  }

  update(id: number, businessUnitId: number, data: UpdateProductRequest): Product {
    const row = db
      .update(products)
      .set({
        ...(data.name !== undefined         && { name:         data.name }),
        ...(data.description !== undefined  && { description:  data.description }),
        ...(data.category !== undefined     && { category:     data.category }),
        ...(data.basePrice !== undefined    && { basePrice:    data.basePrice }),
        ...(data.costPrice !== undefined    && { costPrice:    data.costPrice }),
        ...(data.taxRate !== undefined      && { taxRate:      data.taxRate }),
        ...(data.barcode !== undefined      && { barcode:      data.barcode }),
        ...(data.supplierCode !== undefined && { supplierCode: data.supplierCode }),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .returning()
      .all()[0];

    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);

    // Columnas aditivas (no están en el schema Drizzle tipado)
    const fields: string[] = [];
    const vals:   unknown[] = [];
    if (data.code               !== undefined) { fields.push('code = ?');                vals.push(data.code); }
    if (data.showInCatalog      !== undefined) { fields.push('show_in_catalog = ?');     vals.push(data.showInCatalog ? 1 : 0); }
    if (data.catalogDescription !== undefined) { fields.push('catalog_description = ?'); vals.push(data.catalogDescription); }
    if (data.minimumSalePrice   !== undefined) { fields.push('minimum_sale_price = ?');  vals.push(data.minimumSalePrice); }
    if (data.supplierId         !== undefined) { fields.push('supplier_id = ?');         vals.push(data.supplierId); }
    if (data.supplierLeadTime   !== undefined) { fields.push('supplier_lead_time = ?');  vals.push(data.supplierLeadTime); }
    if (data.showCatalogPrice   !== undefined) { fields.push('show_catalog_price = ?');  vals.push(data.showCatalogPrice ? 1 : 0); }
    if (data.showCatalogStock   !== undefined) { fields.push('show_catalog_stock = ?');  vals.push(data.showCatalogStock ? 1 : 0); }
    if (fields.length > 0) {
      sqlite.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...vals, id);
    }

    return this.getById(id, businessUnitId) ?? enrich(row);
  }

  toggleActive(id: number, businessUnitId: number, isActive: boolean): Product {
    const row = db
      .update(products)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .returning()
      .all()[0];

    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);
    return enrich(row);
  }

  search(businessUnitId: number, query: string): Product[] {
    const all = this.getAll(businessUnitId);
    const strip     = /\p{Mn}/gu;
    const normalize = (s: string) => s.normalize('NFD').replace(strip, '').toLowerCase();
    const q = normalize(query);
    return all.filter(
      (p) =>
        normalize(p.name).includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        normalize(p.category ?? '').includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q) ||         // búsqueda por código de barras
        (p.supplierCode ?? '').toLowerCase().includes(q),      // búsqueda por código proveedor
    );
  }

  getBySkuInBU(sku: string, businessUnitId: number): Product | null {
    const row = db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), eq(products.businessUnitId, businessUnitId)))
      .limit(1)
      .all()[0];
    return row ? enrich(row) : null;
  }

  /**
   * Busca si ya existe un producto con ese barcode en la BU.
   * Acepta un excludeId para ignorar el producto actual en ediciones.
   * Retorna { id, name } del producto que lo tiene, o null si está libre.
   */
  getProductByBarcode(
    barcode: string,
    businessUnitId: number,
    excludeProductId?: number,
  ): { id: number; name: string } | null {
    type Row = { id: number; name: string };
    const excludeClause = excludeProductId ? `AND p.id != ${excludeProductId}` : '';
    const row = sqlite.prepare(`
      SELECT p.id, p.name
      FROM products p
      WHERE p.business_unit_id = ? AND p.barcode = ? AND p.is_active = 1 ${excludeClause}
      LIMIT 1
    `).get(businessUnitId, barcode) as Row | undefined;
    return row ?? null;
  }

  /**
   * Búsqueda exacta por código de barras en la BU activa.
   * Retorna el producto con su stock actual, o null si no existe.
   */
  findByBarcode(
    barcode: string,
    businessUnitId: number,
  ): { productId: number; name: string; sku: string; basePrice: number; taxRate: number; stock: number } | null {
    type Row = { id: number; name: string; sku: string; base_price: number; tax_rate: number; quantity: number | null };
    const row = sqlite.prepare(`
      SELECT p.id, p.name, p.sku, p.base_price, p.tax_rate,
             si.quantity
      FROM products p
      LEFT JOIN stock_items si ON si.product_id = p.id AND si.business_unit_id = p.business_unit_id
      WHERE p.business_unit_id = ? AND p.barcode = ? AND p.is_active = 1
      LIMIT 1
    `).get(businessUnitId, barcode) as Row | undefined;

    if (!row) return null;
    return {
      productId: row.id,
      name:      row.name,
      sku:       row.sku,
      basePrice: row.base_price,
      taxRate:   row.tax_rate,
      stock:     row.quantity ?? 0,
    };
  }

  /** Lista todos los productos (activos) con datos de stock y nombre de proveedor. */
  getAllWithStock(businessUnitId: number): ProductWithStock[] {
    type Row = {
      id: number; business_unit_id: number; name: string; description: string | null;
      category: string | null; sku: string; cost_price: number; base_price: number;
      tax_rate: number; is_active: number; barcode: string | null; supplier_code: string | null;
      created_at: string; updated_at: string;
      quantity: number | null; minimum_threshold: number | null;
      supplier_name: string | null;
      code: string | null; show_in_catalog: number; catalog_description: string | null;
      minimum_sale_price: number | null; supplier_id: number | null;
      supplier_lead_time: number | null; show_catalog_price: number; show_catalog_stock: number;
    };

    const rows = sqlite.prepare(`
      SELECT p.*,
             si.quantity, si.minimum_threshold,
             s.name AS supplier_name
      FROM products p
      LEFT JOIN stock_items si ON si.product_id = p.id AND si.business_unit_id = p.business_unit_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.business_unit_id = ? AND p.is_active = 1
      ORDER BY p.name ASC
    `).all(businessUnitId) as Row[];

    return rows.map((row) => {
      const qty = row.quantity ?? 0;
      const threshold = row.minimum_threshold ?? 5;
      const status: 'ok' | 'low' | 'out' = qty === 0 ? 'out' : qty <= threshold ? 'low' : 'ok';
      return {
        id:               row.id,
        businessUnitId:   row.business_unit_id,
        name:             row.name,
        description:      row.description,
        category:         row.category,
        sku:              row.sku,
        costPrice:        row.cost_price,
        basePrice:        row.base_price,
        taxRate:          row.tax_rate,
        isActive:         Boolean(row.is_active),
        barcode:          row.barcode,
        supplierCode:     row.supplier_code,
        code:             row.code,
        showInCatalog:    Boolean(row.show_in_catalog),
        catalogDescription: row.catalog_description,
        minimumSalePrice: row.minimum_sale_price,
        supplierId:       row.supplier_id,
        supplierLeadTime: row.supplier_lead_time,
        showCatalogPrice: row.show_catalog_price !== 0,
        showCatalogStock: Boolean(row.show_catalog_stock),
        createdAt:        row.created_at,
        updatedAt:        row.updated_at,
        currentStock:     qty,
        minimumThreshold: threshold,
        stockStatus:      status,
        supplierName:     row.supplier_name,
      };
    });
  }

  /** Actualización inline de costo/precio/margen. */
  inlineUpdate(id: number, businessUnitId: number, costPrice: number, basePrice: number): Product {
    const row = db
      .update(products)
      .set({ costPrice, basePrice, updatedAt: new Date().toISOString() })
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .returning()
      .all()[0];
    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);
    return enrich(row);
  }

  /** Actualización masiva de precios por categoría. */
  bulkUpdatePrices(
    businessUnitId: number,
    adjustmentType: 'increase_price_pct' | 'increase_cost_pct' | 'set_margin_pct',
    value: number,
    category?: string | null,
  ): number {
    const allRows = db
      .select()
      .from(products)
      .where(
        category
          ? and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true), eq(products.category, category))
          : and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)),
      )
      .all();

    let updated = 0;
    for (const p of allRows) {
      let newBasePrice = p.basePrice;
      let newCostPrice = p.costPrice;

      if (adjustmentType === 'increase_price_pct') {
        newBasePrice = Math.round(p.basePrice * (1 + value / 100) * 100) / 100;
      } else if (adjustmentType === 'increase_cost_pct') {
        newCostPrice = Math.round(p.costPrice * (1 + value / 100) * 100) / 100;
        // Mantener el margen actual
        const currentMargin = p.costPrice > 0 ? (p.basePrice - p.costPrice) / p.costPrice : 0;
        newBasePrice = Math.round(newCostPrice * (1 + currentMargin) * 100) / 100;
      } else if (adjustmentType === 'set_margin_pct') {
        newBasePrice = Math.round(p.costPrice * (1 + value / 100) * 100) / 100;
      }

      db.update(products)
        .set({ basePrice: newBasePrice, costPrice: newCostPrice, updatedAt: new Date().toISOString() })
        .where(eq(products.id, p.id))
        .run();
      updated++;
    }
    return updated;
  }

  /** Preview de actualización masiva (primeros 5 productos afectados). */
  bulkUpdatePreview(
    businessUnitId: number,
    adjustmentType: 'increase_price_pct' | 'increase_cost_pct' | 'set_margin_pct',
    value: number,
    category?: string | null,
  ): { id: number; name: string; currentPrice: number; newPrice: number; currentCost: number; newCost: number; total: number }[] {
    const allRows = db
      .select()
      .from(products)
      .where(
        category
          ? and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true), eq(products.category, category))
          : and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)),
      )
      .all();

    const preview = allRows.slice(0, 5).map((p) => {
      let newBasePrice = p.basePrice;
      let newCostPrice = p.costPrice;

      if (adjustmentType === 'increase_price_pct') {
        newBasePrice = Math.round(p.basePrice * (1 + value / 100) * 100) / 100;
      } else if (adjustmentType === 'increase_cost_pct') {
        newCostPrice = Math.round(p.costPrice * (1 + value / 100) * 100) / 100;
        const currentMargin = p.costPrice > 0 ? (p.basePrice - p.costPrice) / p.costPrice : 0;
        newBasePrice = Math.round(newCostPrice * (1 + currentMargin) * 100) / 100;
      } else if (adjustmentType === 'set_margin_pct') {
        newBasePrice = Math.round(p.costPrice * (1 + value / 100) * 100) / 100;
      }

      return {
        id:           p.id,
        name:         p.name,
        currentPrice: p.basePrice,
        newPrice:     newBasePrice,
        currentCost:  p.costPrice,
        newCost:      newCostPrice,
        total:        allRows.length,
      };
    });

    return preview;
  }

  /** Historial de compras del producto (entradas de stock con unitCost). */
  getPurchaseHistory(productId: number, businessUnitId: number): PurchaseHistoryEntry[] {
    type Row = {
      created_at: string; quantity: number; unit_cost: number | null;
      reason: string; supplier_name: string | null;
    };
    const rows = sqlite.prepare(`
      SELECT sm.created_at, sm.quantity, sm.unit_cost, sm.reason,
             s.name AS supplier_name
      FROM stock_movements sm
      JOIN stock_items si ON si.id = sm.stock_item_id
      LEFT JOIN products p ON p.id = si.product_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE si.product_id = ? AND sm.business_unit_id = ? AND sm.type = 'entry'
      ORDER BY sm.created_at DESC
      LIMIT 50
    `).all(productId, businessUnitId) as Row[];

    return rows.map((r) => ({
      date:         r.created_at,
      supplierName: r.supplier_name ?? 'Sin proveedor',
      quantity:     r.quantity,
      unitCost:     r.unit_cost ?? 0,
      invoiceRef:   r.reason ?? null,
    }));
  }

  /** Estadísticas de ventas del producto para un período dado. */
  getStats(productId: number, businessUnitId: number, periodDays: number | null): ProductStats {
    const nowISO = new Date().toISOString();
    const fromISO = periodDays
      ? new Date(Date.now() - periodDays * 86400000).toISOString()
      : '1970-01-01T00:00:00.000Z';
    const fromPrevISO = periodDays
      ? new Date(Date.now() - 2 * periodDays * 86400000).toISOString()
      : '1970-01-01T00:00:00.000Z';

    type SaleRow = { sale_id: number; created_at: string; quantity: number; line_total: number; unit_price: number };

    const salesCurrent = sqlite.prepare(`
      SELECT si.sale_id, s.created_at, si.quantity, si.line_total, si.unit_price
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.product_id = ? AND s.business_unit_id = ?
        AND s.status = 'completed' AND s.created_at >= ? AND s.created_at < ?
      ORDER BY s.created_at DESC
    `).all(productId, businessUnitId, fromISO, nowISO) as SaleRow[];

    const salesPrev = sqlite.prepare(`
      SELECT si.quantity, si.line_total, si.unit_price
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.product_id = ? AND s.business_unit_id = ?
        AND s.status = 'completed' AND s.created_at >= ? AND s.created_at < ?
    `).all(productId, businessUnitId, fromPrevISO, fromISO) as SaleRow[];

    const product = this.getById(productId, businessUnitId);
    const cost = product?.costPrice ?? 0;

    const units       = salesCurrent.reduce((s, r) => s + r.quantity, 0);
    const revenue     = salesCurrent.reduce((s, r) => s + r.line_total, 0);
    const netProfit   = Math.round((revenue - units * cost) * 100) / 100;
    const unitsPrev   = salesPrev.reduce((s, r) => s + r.quantity, 0);
    const revenuePrev = salesPrev.reduce((s, r) => s + r.line_total, 0);
    const netProfitPrev = Math.round((revenuePrev - unitsPrev * cost) * 100) / 100;

    // Ventas por mes (para gráfico)
    const byMonth: Record<string, number> = {};
    for (const r of salesCurrent) {
      const month = r.created_at.slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + r.quantity;
    }
    const salesByMonth = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, units]) => ({ month, units }));

    // Historial de costo (entradas de stock)
    type CostRow = { created_at: string; unit_cost: number | null };
    const costRows = sqlite.prepare(`
      SELECT sm.created_at, sm.unit_cost
      FROM stock_movements sm
      JOIN stock_items si ON si.id = sm.stock_item_id
      WHERE si.product_id = ? AND sm.type = 'entry' AND sm.unit_cost IS NOT NULL
      ORDER BY sm.created_at ASC
      LIMIT 20
    `).all(productId) as CostRow[];
    const costHistory = costRows.map((r) => ({ date: r.created_at, unitCost: r.unit_cost! }));

    // Crecimiento de costo
    let costGrowthPct: number | null = null;
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    const oldCostRow = costRows.find((r) => r.created_at <= oneYearAgo);
    const lastCostRow = costRows[costRows.length - 1];
    if (oldCostRow && lastCostRow && oldCostRow.unit_cost && lastCostRow.unit_cost) {
      costGrowthPct = Math.round(((lastCostRow.unit_cost - oldCostRow.unit_cost) / oldCostRow.unit_cost) * 10000) / 100;
    }

    const recentSales: ProductStatSale[] = salesCurrent.slice(0, 5).map((r) => ({
      saleId:    r.sale_id,
      date:      r.created_at,
      quantity:  r.quantity,
      lineTotal: r.line_total,
    }));

    const stat: ProductStat = {
      period:       periodDays ? `${periodDays}d` : 'all',
      unitsSold:    units,
      revenue:      Math.round(revenue * 100) / 100,
      netProfit,
      unitsSoldPrev:  unitsPrev,
      revenuePrev:    Math.round(revenuePrev * 100) / 100,
      netProfitPrev,
    };

    return { stats: stat, salesByMonth, costHistory, recentSales, costGrowthPct };
  }
}
