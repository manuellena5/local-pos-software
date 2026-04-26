import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../../db/connection';
import { stockItems, stockMovements, products } from '../../db/schema';
import type { StockItem, StockMovement, StockSummary } from '../../../shared/types';
import { NotFoundError } from '../../lib/errors';

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
    const conditions: any[] = [eq(stockMovements.businessUnitId, businessUnitId)];

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
    const rows = db
      .select({
        productId: products.id,
        name: products.name,
        sku: products.sku,
        quantity: stockItems.quantity,
        minimumThreshold: stockItems.minimumThreshold,
        updatedAt: stockItems.updatedAt,
      })
      .from(products)
      .innerJoin(stockItems, eq(products.id, stockItems.productId))
      .where(
        and(
          eq(products.businessUnitId, businessUnitId),
          eq(products.isActive, true),
          eq(stockItems.businessUnitId, businessUnitId)
        )
      )
      .all();

    return rows.map((row) => ({
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      currentQuantity: row.quantity,
      minimumThreshold: row.minimumThreshold,
      status: this.getStockStatus(row.quantity, row.minimumThreshold),
      lastUpdated: row.updatedAt,
    }));
  }

  private getStockStatus(quantity: number, threshold: number): 'ok' | 'low' | 'out' {
    if (quantity === 0) return 'out';
    if (quantity < threshold) return 'low';
    return 'ok';
  }
}
