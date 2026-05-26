import { eq, and, desc, sql, gte, lte, like } from 'drizzle-orm';
import { db, sqlite } from '../../db/connection';
import { sales, saleItems, stockItems, stockMovements } from '../../db/schema';
import type { Sale, SaleItem, SaleWithItems, PaymentMethod, SaleFilters } from '../../../shared/types';
import type { CreateSaleRequest } from '../types';
import { BusinessRuleError, NotFoundError } from '../../lib/errors';

function rowToSale(row: typeof sales.$inferSelect): Sale {
  return {
    ...row,
    paymentMethods: JSON.parse(row.paymentMethods) as PaymentMethod[],
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    cancelledBy: row.cancelledBy ?? null,
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

  /**
   * Devuelve ventas filtradas por rango de fecha, estado, medio de pago y búsqueda.
   * Siempre filtra por businessUnitId.
   */
  getFiltered(businessUnitId: number, filters: SaleFilters): Sale[] {
    const conditions = [eq(sales.businessUnitId, businessUnitId)];

    if (filters.dateFrom) {
      conditions.push(gte(sales.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      // Incluir todo el día final
      conditions.push(lte(sales.createdAt, filters.dateTo + ' 23:59:59'));
    }
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(sales.status, filters.status));
    }

    let rows = db
      .select()
      .from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.createdAt))
      .all();

    // Filtro de medio de pago: buscar en el JSON de paymentMethods
    if (filters.paymentMethod) {
      const method = filters.paymentMethod.toLowerCase();
      rows = rows.filter((r) => r.paymentMethods.toLowerCase().includes(method));
    }

    // Filtro de búsqueda: número de venta, ID de cliente o producto (via sale_items)
    if (filters.search) {
      const term = filters.search.toLowerCase().trim();
      const numericTerm = parseInt(term, 10);

      // Obtener IDs de ventas que tienen un item cuyo productName coincide
      const matchingItemSaleIds = new Set<number>(
        db
          .select({ saleId: saleItems.saleId })
          .from(saleItems)
          .where(
            and(
              like(saleItems.productName, `%${term}%`),
            ),
          )
          .all()
          .map((r) => r.saleId),
      );

      rows = rows.filter((r) => {
        if (!isNaN(numericTerm) && r.saleNumber === numericTerm) return true;
        if (r.customerId !== null && !isNaN(numericTerm) && r.customerId === numericTerm) return true;
        if (matchingItemSaleIds.has(r.id)) return true;
        return false;
      });
    }

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
          sql`DATE(created_at) = DATE('now')`,
        ),
      )
      .all();

    const maxNum = result[0]?.maxNum ?? 0;
    return (maxNum ?? 0) + 1;
  }

  /**
   * Cancela una venta en transacción atómica:
   * 1. Valida que exista, pertenezca a la BU y esté en estado 'completed'
   * 2. Actualiza estado + metadatos de cancelación
   * 3. Revierte el stock de cada sale_item (si tiene stock_item asociado)
   * 4. Registra un stock_movement de tipo 'adjustment' por cada ítem
   */
  cancel(
    saleId: number,
    businessUnitId: number,
    reason: string,
    userId?: number,
  ): SaleWithItems {
    return sqlite.transaction(() => {
      // 1. Obtener venta con sus ítems
      const existing = this.getById(saleId, businessUnitId);
      if (!existing) {
        throw new NotFoundError(`Venta ${saleId} no encontrada`);
      }
      if (existing.sale.status === 'cancelled') {
        throw new BusinessRuleError('La venta ya fue anulada anteriormente');
      }

      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

      // 2. Actualizar estado de la venta
      db.update(sales)
        .set({
          status: 'cancelled',
          cancelledAt: now,
          cancellationReason: reason,
          cancelledBy: userId ?? null,
        })
        .where(eq(sales.id, saleId))
        .run();

      // 3. Revertir stock por cada ítem
      for (const item of existing.items) {
        const stockRows = db
          .select()
          .from(stockItems)
          .where(
            and(
              eq(stockItems.productId, item.productId),
              eq(stockItems.businessUnitId, businessUnitId),
            ),
          )
          .limit(1)
          .all();

        const stockItem = stockRows[0];
        if (!stockItem) continue; // sin stock_item = servicio, no requiere reversión

        const newQty = stockItem.quantity + item.quantity;

        db.update(stockItems)
          .set({ quantity: newQty, updatedAt: now })
          .where(eq(stockItems.id, stockItem.id))
          .run();

        // 4. Registrar movimiento de stock
        db.insert(stockMovements)
          .values({
            stockItemId: stockItem.id,
            businessUnitId,
            type: 'adjustment',
            quantity: item.quantity, // positivo = reingreso
            reason: `Anulación de venta #${existing.sale.saleNumber}`,
            userId: userId ?? null,
          })
          .run();
      }

      // Releer para devolver estado actualizado
      return this.getById(saleId, businessUnitId)!;
    })();
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
          customerId: data.customerId ?? null,
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
              eq(stockItems.businessUnitId, data.businessUnitId),
            ),
          )
          .limit(1)
          .all();

        const stockItem = stockRows[0];

        // Si hay stock_item (servicios pueden no tener), descontar
        if (stockItem) {
          const newQty = stockItem.quantity - item.quantity;

          if (newQty < 0) {
            throw new BusinessRuleError(
              `Stock insuficiente para "${item.productName}". Disponible: ${stockItem.quantity}, solicitado: ${item.quantity}`,
            );
          }

          db.update(stockItems)
            .set({ quantity: newQty, updatedAt: new Date().toISOString() })
            .where(eq(stockItems.id, stockItem.id))
            .run();

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

  /**
   * Actualiza los campos AFIP en una venta existente.
   * Llamado por InvoiceQueueService tras recibir respuesta de AFIP.
   */
  updateInvoiceFields(
    saleId: number,
    fields: {
      invoiceNumber?: string;
      cae?: string;
      caeExpiration?: string;
      invoiceStatus: 'pending' | 'issued' | 'error' | 'failed';
      invoiceError?: string | null;
      invoiceAttempts: number;
      lastInvoiceAttemptAt: string;
    },
  ): void {
    db.update(sales)
      .set({
        invoiceNumber: fields.invoiceNumber ?? null,
        cae: fields.cae ?? null,
        caeExpiration: fields.caeExpiration ?? null,
        invoiceStatus: fields.invoiceStatus,
        invoiceError: fields.invoiceError ?? null,
        invoiceAttempts: fields.invoiceAttempts,
        lastInvoiceAttemptAt: fields.lastInvoiceAttemptAt,
      })
      .where(eq(sales.id, saleId))
      .run();
  }
}
