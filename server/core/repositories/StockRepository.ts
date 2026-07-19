import { eq, and, gte, lte } from 'drizzle-orm';
import { db, sqlite } from '../../db/connection';
import { stockItems, stockMovements, products } from '../../db/schema';
import type { StockItem, StockMovement, StockSummary, ProductStockDetail } from '../../../shared/types';

/** Fila de variante usada por el detalle de stock (tabla del módulo retail-textil) */
type VariantDetailRow = {
  id: number;
  attribute_type: string;
  attribute_value: string;
  stock: number;
  cost_price: number;
};

export class StockRepository {
  getByProductId(productId: number, businessUnitId: number): StockItem | null {
    const rows = db
      .select()
      .from(stockItems)
      .where(and(eq(stockItems.productId, productId), eq(stockItems.businessUnitId, businessUnitId)))
      .limit(1)
      .all();
    return rows[0] ?? null;
  }

  recordMovement(
    stockItemId: number,
    businessUnitId: number,
    type: 'entry' | 'sale' | 'adjustment',
    quantity: number,
    reason: string,
    userId?: number
  ): StockMovement {
    const rows = db
      .insert(stockMovements)
      .values({
        stockItemId,
        businessUnitId,
        type,
        quantity,
        reason,
        userId,
      })
      .returning()
      .all();
    return rows[0]!;
  }

  updateStockQuantity(stockItemId: number, newQuantity: number): void {
    db.update(stockItems)
      .set({
        quantity: newQuantity,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(stockItems.id, stockItemId))
      .run();
  }

  getMovementHistory(
    businessUnitId: number,
    filters?: {
      productId?: number;
      fromDate?: string;
      toDate?: string;
      type?: 'entry' | 'sale' | 'adjustment';
    }
  ): StockMovement[] {
    // Build conditions dynamically
    const conditions: ReturnType<typeof eq>[] = [eq(stockMovements.businessUnitId, businessUnitId)];

    if (filters?.type) {
      conditions.push(eq(stockMovements.type, filters.type));
    }

    if (filters?.fromDate) {
      conditions.push(gte(stockMovements.createdAt, filters.fromDate));
    }

    if (filters?.toDate) {
      conditions.push(lte(stockMovements.createdAt, filters.toDate));
    }

    let movements = db
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(stockMovements.createdAt)
      .all();

    // Filter by productId if specified
    if (filters?.productId) {
      const stockItem = db
        .select()
        .from(stockItems)
        .where(eq(stockItems.productId, filters.productId))
        .limit(1)
        .all()[0];

      if (!stockItem) return [];

      movements = movements.filter((m) => m.stockItemId === stockItem.id);
    }

    return movements;
  }

  getMovementsByProduct(productId: number, businessUnitId: number): StockMovement[] {
    // Get stock item for this product first
    const stockItem = this.getByProductId(productId, businessUnitId);
    if (!stockItem) return [];

    const rows = db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.stockItemId, stockItem.id),
          eq(stockMovements.businessUnitId, businessUnitId)
        )
      )
      .orderBy(stockMovements.createdAt)
      .all()
      .reverse(); // más recientes primero

    return rows.map((m) => this.enrichMovement(m));
  }

  /** Anexa etiqueta de variante y nombre de proveedor al movimiento (joins suaves). */
  private enrichMovement(m: StockMovement): StockMovement {
    let variantLabel: string | null = null;
    let supplierName: string | null = null;

    if (m.variantId) {
      try {
        type VRow = { attribute_type: string; attribute_value: string };
        const v = sqlite
          .prepare('SELECT attribute_type, attribute_value FROM product_variants WHERE id = ?')
          .get(m.variantId) as VRow | undefined;
        if (v) variantLabel = `${v.attribute_type}: ${v.attribute_value}`;
      } catch { /* tabla del módulo no migrada */ }
    }
    // Variante eliminada o movimiento anterior a la columna variant_id:
    // usar el snapshot guardado en notes
    if (!variantLabel && m.notes?.startsWith('Variante: ')) {
      variantLabel = m.notes.slice('Variante: '.length);
    }

    if (m.supplierId) {
      try {
        type SRow = { name: string };
        const s = sqlite
          .prepare('SELECT name FROM suppliers WHERE id = ?')
          .get(m.supplierId) as SRow | undefined;
        if (s) supplierName = s.name;
      } catch { /* tabla suppliers no migrada */ }
    }

    return { ...m, variantLabel, supplierName };
  }

  /**
   * Detalle de stock para el modal de movimientos: stock real del producto
   * y sus variantes activas (vacío si no usa variantes o el módulo no está activo).
   */
  getStockDetail(productId: number, businessUnitId: number): ProductStockDetail | null {
    type Row = { id: number; name: string; sku: string; quantity: number | null; minimum_threshold: number | null };
    const row = sqlite.prepare(`
      SELECT p.id, p.name, p.sku, si.quantity, si.minimum_threshold
      FROM products p
      LEFT JOIN stock_items si ON si.product_id = p.id
      WHERE p.id = ? AND p.business_unit_id = ?
      LIMIT 1
    `).get(productId, businessUnitId) as Row | undefined;
    if (!row) return null;

    let variants: VariantDetailRow[] = [];
    try {
      variants = sqlite.prepare(`
        SELECT id, attribute_type, attribute_value, stock, cost_price
        FROM product_variants
        WHERE product_id = ? AND is_active = 1
        ORDER BY id ASC
      `).all(productId) as VariantDetailRow[];
    } catch { /* tabla del módulo retail-textil no migrada */ }

    return {
      productId: row.id,
      name: row.name,
      sku: row.sku,
      currentStock: row.quantity ?? 0,
      minimumThreshold: row.minimum_threshold ?? 5,
      variants: variants.map((v) => ({
        id: v.id,
        attributeType: v.attribute_type,
        attributeValue: v.attribute_value,
        stock: v.stock,
        costPrice: v.cost_price,
      })),
    };
  }

  getStockSummary(businessUnitId: number): StockSummary[] {
    // LEFT JOIN para incluir productos que aún no tienen stock_item creado
    const rows = db
      .select({
        productId:        products.id,
        name:             products.name,
        sku:              products.sku,
        quantity:         stockItems.quantity,
        minimumThreshold: stockItems.minimumThreshold,
        updatedAt:        stockItems.updatedAt,
      })
      .from(products)
      .leftJoin(
        stockItems,
        and(eq(products.id, stockItems.productId), eq(stockItems.businessUnitId, businessUnitId)),
      )
      .where(and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)))
      .all();

    return rows.map((row) => ({
      productId:        row.productId,
      name:             row.name,
      sku:              row.sku,
      currentQuantity:  row.quantity ?? 0,
      minimumThreshold: row.minimumThreshold ?? 5,
      status:           this.getStockStatus(row.quantity ?? 0, row.minimumThreshold ?? 5),
      lastUpdated:      row.updatedAt ?? new Date().toISOString(),
    }));
  }

  /**
   * Crea un movimiento de stock tipado (entrada/salida/ajuste) con validación de stock negativo.
   * Si se indica variantId, el movimiento opera sobre el stock de la variante y el
   * stock del producto padre se resincroniza a la suma de variantes activas.
   * Para 'ajuste', quantity es el stock real contado (valor absoluto).
   */
  createMovement(
    productId: number,
    businessUnitId: number,
    type: 'entrada' | 'salida' | 'ajuste',
    quantity: number,
    unitCost?: number,
    reason?: string,
    userId?: number,
    variantId?: number,
    supplierId?: number,
  ): { movement: StockMovement; newQuantity: number } {
    return sqlite.transaction(() => {
      const stockItem = this.getByProductId(productId, businessUnitId);
      if (!stockItem) throw new Error(`StockItem no encontrado para producto ${productId}`);

      const dbType = type === 'entrada' ? 'entry' : type === 'salida' ? 'sale' : 'adjustment';
      const defaultReason =
        type === 'entrada' ? 'Entrada de stock' : type === 'salida' ? 'Salida de stock' : 'Ajuste de inventario';

      if (variantId) {
        // ── Movimiento sobre una variante ────────────────────────────────
        type VRow = { stock: number; attribute_value: string };
        const variant = sqlite
          .prepare('SELECT stock, attribute_value FROM product_variants WHERE id = ? AND product_id = ?')
          .get(variantId, productId) as VRow | undefined;
        if (!variant) throw new Error(`Variante ${variantId} no encontrada para producto ${productId}`);

        const before = variant.stock;
        let delta: number;
        if (type === 'entrada') delta = quantity;
        else if (type === 'salida') delta = -quantity;
        else delta = quantity - before; // ajuste: conteo físico

        const after = before + delta;
        if (after < 0) {
          throw new Error(`Stock insuficiente. Stock actual: ${before}, solicitado: ${quantity}`);
        }

        sqlite
          .prepare(`UPDATE product_variants SET stock = ?, updated_at = datetime('now') WHERE id = ?`)
          .run(after, variantId);

        // Resincronizar padre = suma de variantes activas
        sqlite
          .prepare(
            `UPDATE stock_items
             SET quantity = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = ? AND is_active = 1),
                 updated_at = datetime('now')
             WHERE id = ?`,
          )
          .run(productId, stockItem.id);

        const movement = this.recordMovementWithCost(
          stockItem.id,
          businessUnitId,
          dbType,
          Math.abs(delta),
          reason ?? defaultReason,
          unitCost,
          userId,
          {
            variantId,
            supplierId,
            quantityBefore: before,
            quantityAfter: after,
            notes: `Variante: ${variant.attribute_value}`,
          },
        );

        return { movement, newQuantity: after };
      }

      // ── Movimiento sobre el producto sin variantes ─────────────────────
      let delta: number;
      if (type === 'entrada') {
        delta = quantity;
      } else if (type === 'salida') {
        delta = -quantity;
      } else {
        // ajuste: quantity es el stock real contado; delta = real - actual
        delta = quantity - stockItem.quantity;
      }

      const newQuantity = stockItem.quantity + delta;
      if (newQuantity < 0) {
        throw new Error(`Stock insuficiente. Stock actual: ${stockItem.quantity}, solicitado: ${quantity}`);
      }

      this.updateStockQuantity(stockItem.id, newQuantity);

      const movement = this.recordMovementWithCost(
        stockItem.id,
        businessUnitId,
        dbType,
        Math.abs(delta),
        reason ?? defaultReason,
        unitCost,
        userId,
        {
          supplierId,
          quantityBefore: stockItem.quantity,
          quantityAfter: newQuantity,
        },
      );

      return { movement, newQuantity };
    })();
  }

  private recordMovementWithCost(
    stockItemId: number,
    businessUnitId: number,
    type: 'entry' | 'sale' | 'adjustment',
    quantity: number,
    reason: string,
    unitCost?: number,
    userId?: number,
    extra?: {
      variantId?: number;
      supplierId?: number;
      quantityBefore?: number;
      quantityAfter?: number;
      notes?: string;
    },
  ): StockMovement {
    const rows = db
      .insert(stockMovements)
      .values({
        stockItemId,
        businessUnitId,
        type,
        quantity,
        reason,
        unitCost,
        userId,
        variantId: extra?.variantId ?? null,
        supplierId: extra?.supplierId ?? null,
        quantityBefore: extra?.quantityBefore ?? null,
        quantityAfter: extra?.quantityAfter ?? null,
        notes: extra?.notes ?? null,
      })
      .returning()
      .all();
    return rows[0]!;
  }

  /** Actualiza el costo de una variante (entrada de mercadería con costo). */
  updateVariantCost(variantId: number, unitCost: number): void {
    try {
      sqlite
        .prepare(`UPDATE product_variants SET cost_price = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(unitCost, variantId);
    } catch { /* tabla del módulo no migrada */ }
  }

  getLastEntryDate(productId: number, businessUnitId: number): string | null {
    const stockItem = this.getByProductId(productId, businessUnitId);
    if (!stockItem) return null;
    const row = db
      .select({ createdAt: stockMovements.createdAt })
      .from(stockMovements)
      .where(and(eq(stockMovements.stockItemId, stockItem.id), eq(stockMovements.type, 'entry')))
      .orderBy(stockMovements.createdAt)
      .limit(1)
      .all()[0];
    return row?.createdAt ?? null;
  }

  private getStockStatus(quantity: number, threshold: number): 'ok' | 'low' | 'out' {
    if (quantity === 0) return 'out';
    if (quantity < threshold) return 'low';
    return 'ok';
  }
}
