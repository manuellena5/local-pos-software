import { eq, and, desc, sql, gte, lte, like } from 'drizzle-orm';
import { db, sqlite } from '../../db/connection';
import { sales, saleItems, stockItems, stockMovements, customers, cashMovements } from '../../db/schema';
import type { Sale, SaleItem, SaleWithItems, PaymentMethod, SaleFilters, SaleListEntry, SalePreviewItem } from '../../../shared/types';
import type { CreateSaleRequest } from '../types';
import { BusinessRuleError, NotFoundError, InsufficientStockError } from '../../lib/errors';
import type { InsufficientStockItem } from '../../../shared/types';

// sales.createdAt se guarda vía SQLite datetime('now'), que es siempre UTC.
// dateFrom/dateTo llegan como "YYYY-MM-DD" en hora LOCAL — hay que convertir
// el día calendario local a su equivalente UTC antes de comparar, o "hoy"
// quedaría mal alineado apenas UTC cruza medianoche (~21:00 ART).
function localDateToUtcBoundary(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const localMidnight = new Date(y!, m! - 1, d!, 0, 0, 0, 0);
  return localMidnight.toISOString().replace('T', ' ').slice(0, 19);
}

function localDateToUtcEndOfDayBoundary(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const localEndOfDay = new Date(y!, m! - 1, d!, 23, 59, 59, 999);
  return localEndOfDay.toISOString().replace('T', ' ').slice(0, 19);
}

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

  /** Lógica de filtrado compartida — devuelve filas crudas para poder enriquecer sin N+1 */
  private getFilteredRows(
    businessUnitId: number,
    filters: SaleFilters,
  ): (typeof sales.$inferSelect)[] {
    const conditions = [eq(sales.businessUnitId, businessUnitId)];

    // Si viene cashSessionId, resolver el rango exacto de la sesión (timestamps completos).
    // Si no, usar los filtros de fecha normales (con sufijo 23:59:59 en dateTo).
    if (filters.cashSessionId) {
      const openingRow = db
        .select()
        .from(cashMovements)
        .where(eq(cashMovements.id, filters.cashSessionId))
        .get();
      if (openingRow) {
        conditions.push(gte(sales.createdAt, openingRow.createdAt));
        type AuditRow = { created_at: string };
        const closingAudit = sqlite
          .prepare(
            `SELECT created_at FROM cash_audits
             WHERE business_unit_id = ? AND created_at > ?
             ORDER BY created_at ASC LIMIT 1`,
          )
          .get(businessUnitId, openingRow.createdAt) as AuditRow | undefined;
        if (closingAudit) {
          conditions.push(lte(sales.createdAt, closingAudit.created_at));
        }
      }
    } else {
      if (filters.dateFrom) {
        conditions.push(gte(sales.createdAt, localDateToUtcBoundary(filters.dateFrom)));
      }
      if (filters.dateTo) {
        // Incluir todo el día final
        conditions.push(lte(sales.createdAt, localDateToUtcEndOfDayBoundary(filters.dateTo)));
      }
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

    // Filtro de búsqueda: número de venta, nombre de cliente o producto (via sale_items)
    if (filters.search) {
      const raw = filters.search.toLowerCase().trim();
      // Permitir "#10" además de "10" para buscar por número de venta
      const term = raw.startsWith('#') ? raw.slice(1) : raw;
      const numericTerm = parseInt(term, 10);

      // Ventas que tienen un item cuyo productName coincide
      const matchingItemSaleIds = new Set<number>(
        db
          .select({ saleId: saleItems.saleId })
          .from(saleItems)
          .where(like(saleItems.productName, `%${term}%`))
          .all()
          .map((r) => r.saleId),
      );

      // Clientes cuyo nombre coincide con el término (búsqueda parcial)
      const matchingCustomerIds = new Set<number>(
        db
          .select({ id: customers.id })
          .from(customers)
          .where(like(customers.name, `%${term}%`))
          .all()
          .map((r) => r.id),
      );

      rows = rows.filter((r) => {
        if (!isNaN(numericTerm) && r.saleNumber === numericTerm) return true;
        if (matchingItemSaleIds.has(r.id)) return true;
        if (r.customerId !== null && matchingCustomerIds.has(r.customerId)) return true;
        return false;
      });
    }

    return rows;
  }

  /**
   * Devuelve ventas filtradas por rango de fecha, estado, medio de pago y búsqueda.
   * Siempre filtra por businessUnitId.
   */
  getFiltered(businessUnitId: number, filters: SaleFilters): Sale[] {
    return this.getFilteredRows(businessUnitId, filters).map(rowToSale);
  }

  /**
   * Enriquece filas de ventas con preview de ítems y datos de cliente.
   * Usa exactamente 2 queries batch adicionales — sin N+1.
   */
  private enrichWithPreview(rows: (typeof sales.$inferSelect)[]): SaleListEntry[] {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');

    type ItemRow = { sale_id: number; product_name: string; quantity: number };
    const allItems = sqlite
      .prepare(`SELECT sale_id, product_name, quantity FROM sale_items WHERE sale_id IN (${placeholders}) ORDER BY id`)
      .all(...ids) as ItemRow[];

    const customerIds = [...new Set(rows.map((r) => r.customerId).filter((id): id is number => id !== null))];
    type CustomerRow = { id: number; name: string; document: string | null; document_type: string | null };
    const customerMap = new Map<number, CustomerRow>();
    if (customerIds.length > 0) {
      const cPlaceholders = customerIds.map(() => '?').join(',');
      const customerRows = sqlite
        .prepare(`SELECT id, name, document, document_type FROM customers WHERE id IN (${cPlaceholders})`)
        .all(...customerIds) as CustomerRow[];
      for (const c of customerRows) customerMap.set(c.id, c);
    }

    const itemsBySale = new Map<number, SalePreviewItem[]>();
    for (const item of allItems) {
      if (!itemsBySale.has(item.sale_id)) itemsBySale.set(item.sale_id, []);
      itemsBySale.get(item.sale_id)!.push({ productName: item.product_name, quantity: item.quantity });
    }

    return rows.map((row) => {
      const sale = rowToSale(row);
      const saleItemList = itemsBySale.get(row.id) ?? [];
      const customer = row.customerId !== null ? (customerMap.get(row.customerId) ?? null) : null;
      return {
        ...sale,
        items: saleItemList.slice(0, 3),
        totalItems: saleItemList.length,
        totalUnits: saleItemList.reduce((s, i) => s + i.quantity, 0),
        customerName: customer?.name ?? null,
        customerDocument: customer?.document ?? null,
        customerDocumentType: customer?.document_type ?? null,
      };
    });
  }

  getAllWithPreview(businessUnitId: number): SaleListEntry[] {
    const rows = db
      .select()
      .from(sales)
      .where(eq(sales.businessUnitId, businessUnitId))
      .orderBy(desc(sales.createdAt))
      .all();
    return this.enrichWithPreview(rows);
  }

  getFilteredWithPreview(businessUnitId: number, filters: SaleFilters): SaleListEntry[] {
    return this.enrichWithPreview(this.getFilteredRows(businessUnitId, filters));
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
        // Reingresar stock de la variante vendida (módulo retail-textil)
        if (item.variantId) {
          try {
            sqlite
              .prepare(
                `UPDATE product_variants SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?`,
              )
              .run(item.quantity, item.variantId);
          } catch { /* tabla del módulo no migrada */ }
        }

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
            variantId: item.variantId ?? null,
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
      // 0. Pre-validación: verificar stock de todos los ítems antes de cualquier mutación
      const stockFailures: InsufficientStockItem[] = [];

      for (const item of data.items) {
        if (item.variantId) {
          type VariantRow = { stock: number };
          const variant = sqlite
            .prepare('SELECT stock FROM product_variants WHERE id = ?')
            .get(item.variantId) as VariantRow | undefined;
          if (variant && variant.stock < item.quantity) {
            stockFailures.push({
              productName: item.productName,
              requested: item.quantity,
              available: variant.stock,
            });
          }
        } else {
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
          if (stockItem && stockItem.quantity < item.quantity) {
            stockFailures.push({
              productName: item.productName,
              requested: item.quantity,
              available: stockItem.quantity,
            });
          }
        }
      }

      if (stockFailures.length > 0) {
        const names = stockFailures.map((f) => f.productName).join(', ');
        throw new InsufficientStockError(`Stock insuficiente para: ${names}`, stockFailures);
      }

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
          roundingAdjustment: data.roundingAdjustment,
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
            variantId: item.variantId ?? null,
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

        // Si se vendió una variante (módulo retail-textil), descontar su stock.
        // El stock_item del padre se descuenta abajo y queda = SUM(variantes).
        if (item.variantId) {
          type VariantRow = { stock: number };
          const variant = sqlite
            .prepare('SELECT stock FROM product_variants WHERE id = ?')
            .get(item.variantId) as VariantRow | undefined;

          if (variant) {
            if (variant.stock < item.quantity) {
              throw new BusinessRuleError(
                `Stock insuficiente para "${item.productName}". Disponible: ${variant.stock}, solicitado: ${item.quantity}`,
              );
            }
            sqlite
              .prepare(
                `UPDATE product_variants SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?`,
              )
              .run(item.quantity, item.variantId);
          }
        }

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
              variantId: item.variantId ?? null,
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
