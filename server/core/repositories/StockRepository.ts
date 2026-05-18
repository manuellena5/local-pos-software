import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../../db/connection';
import { stockItems, stockMovements, products } from '../../db/schema';
import type { StockItem, StockMovement, StockSummary } from '../../../shared/types';

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

    return db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.stockItemId, stockItem.id),
          eq(stockMovements.businessUnitId, businessUnitId)
        )
      )
      .orderBy(stockMovements.createdAt)
      .all();
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
   * Para 'ajuste', qty puede ser negativo (diferencia real - actual).
   */
  createMovement(
    productId: number,
    businessUnitId: number,
    type: 'entrada' | 'salida' | 'ajuste',
    quantity: number,
    unitCost?: number,
    reason?: string,
    userId?: number,
  ): { movement: StockMovement; newQuantity: number } {
    const stockItem = this.getByProductId(productId, businessUnitId);
    if (!stockItem) throw new Error(`StockItem no encontrado para producto ${productId}`);

    const dbType = type === 'entrada' ? 'entry' : type === 'salida' ? 'sale' : 'adjustment';
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
      reason ?? (type === 'entrada' ? 'Entrada de stock' : type === 'salida' ? 'Salida de stock' : 'Ajuste de inventario'),
      unitCost,
      userId,
    );

    return { movement, newQuantity };
  }

  private recordMovementWithCost(
    stockItemId: number,
    businessUnitId: number,
    type: 'entry' | 'sale' | 'adjustment',
    quantity: number,
    reason: string,
    unitCost?: number,
    userId?: number,
  ): StockMovement {
    const rows = db
      .insert(stockMovements)
      .values({ stockItemId, businessUnitId, type, quantity, reason, unitCost, userId })
      .returning()
      .all();
    return rows[0]!;
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
