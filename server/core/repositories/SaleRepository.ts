import { eq, and, desc, sql } from 'drizzle-orm';
import { db, sqlite } from '../../db/connection';
import { sales, saleItems, stockItems, stockMovements } from '../../db/schema';
import type { Sale, SaleItem, SaleWithItems, PaymentMethod } from '../../../shared/types';
import type { CreateSaleRequest } from '../types';
import { BusinessRuleError } from '../../lib/errors';

function rowToSale(row: typeof sales.$inferSelect): Sale {
  return {
    ...row,
    paymentMethods: JSON.parse(row.paymentMethods) as PaymentMethod[],
  };
}

export class SaleRepository {
  getAll(businessUnitId: number): Sale[] {
    const rows = db
      .select()
      .from(sales)
      .where(eq(sales.businessUnitId, businessUnitId))
      .orderBy(desc(sales.createdAt))
      .all();
    return rows.map(rowToSale);
  }

  getById(id: number, businessUnitId: number): SaleWithItems | null {
    const saleRows = db
      .select()
      .from(sales)
      .where(and(eq(sales.id, id), eq(sales.businessUnitId, businessUnitId)))
      .limit(1)
      .all();

    if (!saleRows[0]) return null;

    const itemRows = db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, id))
      .all();

    return {
      sale: rowToSale(saleRows[0]),
      items: itemRows,
    };
  }

  getNextSaleNumber(businessUnitId: number): number {
    const result = db
      .select({ maxNum: sql<number>`MAX(sale_number)` })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          // Solo ventas del día actual
          sql`DATE(created_at) = DATE('now')`
        )
      )
      .all();

    const maxNum = result[0]?.maxNum ?? 0;
    return (maxNum ?? 0) + 1;
  }

  /**
   * Crea la venta en una transacción atómica:
   * 1. Inserta sale
   * 2. Inserta sale_items
   * 3. Por cada item: valida stock → descuenta → registra movimiento
   * Si cualquier paso falla, rollback automático.
   */
  create(data: CreateSaleRequest): SaleWithItems {
    return sqlite.transaction(() => {
      const saleNumber = this.getNextSaleNumber(data.businessUnitId);

      // 1. Insertar venta
      const saleRows = db
        .insert(sales)
        .values({
          businessUnitId: data.businessUnitId,
          userId: data.userId ?? null,
          saleNumber,
          subtotal: data.subtotal,
          discountAmount: data.discountAmount,
          discountPercent: data.discountPercent,
          taxableAmount: data.taxableAmount,
          taxRate: data.taxRate,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          paymentMethods: JSON.stringify(data.paymentMethods),
          status: 'completed',
        })
        .returning()
        .all();

      const sale = saleRows[0]!;

      // 2. Insertar items y descontar stock
      const insertedItems: SaleItem[] = [];

      for (const item of data.items) {
        // Insertar sale_item
        const itemRows = db
          .insert(saleItems)
          .values({
            saleId: sale.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discountPercent: item.discountPercent,
            lineTotal: item.lineTotal,
          })
          .returning()
          .all();

        insertedItems.push(itemRows[0]!);

        // 3. Obtener y validar stock
        const stockRows = db
          .select()
          .from(stockItems)
          .where(
            and(
              eq(stockItems.productId, item.productId),
              eq(stockItems.businessUnitId, data.businessUnitId)
            )
          )
          .limit(1)
          .all();

        const stockItem = stockRows[0];

        // Si hay stock_item (servicios pueden no tener), descontar
        if (stockItem) {
          const newQty = stockItem.quantity - item.quantity;

          if (newQty < 0) {
            // BusinessRuleError → rollback de la transacción + respuesta 400 al cliente
            throw new BusinessRuleError(
              `Stock insuficiente para "${item.productName}". Disponible: ${stockItem.quantity}, solicitado: ${item.quantity}`
            );
          }

          // Descontar stock
          db.update(stockItems)
            .set({ quantity: newQty, updatedAt: new Date().toISOString() })
            .where(eq(stockItems.id, stockItem.id))
            .run();

          // Registrar movimiento (append-only)
          db.insert(stockMovements)
            .values({
              stockItemId: stockItem.id,
              businessUnitId: data.businessUnitId,
              type: 'sale',
              quantity: -item.quantity,
              reason: `Venta #${saleNumber}`,
              userId: data.userId ?? null,
            })
            .run();
        }
      }

      return {
        sale: rowToSale(sale),
        items: insertedItems,
      };
    })();
  }
}
