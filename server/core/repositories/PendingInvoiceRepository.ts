import { db } from '../../db/connection';
import { pendingInvoices } from '../../db/schema';
import { eq, lte } from 'drizzle-orm';
import type { PendingInvoice } from '../../../shared/types';

export class PendingInvoiceRepository {
  /** Encola una factura pendiente. Si ya existe para ese saleId, no falla. */
  enqueue(
    saleId: number,
    businessUnitId: number,
    invoiceType: 'B' | 'C' = 'B',
  ): PendingInvoice {
    const existing = db
      .select()
      .from(pendingInvoices)
      .where(eq(pendingInvoices.saleId, saleId))
      .get();
    if (existing) return this.rowToModel(existing);

    const row = db
      .insert(pendingInvoices)
      .values({ saleId, businessUnitId, invoiceType, retryCount: 0 })
      .returning()
      .get();
    return this.rowToModel(row);
  }

  /** Obtiene todas las pendientes con retryCount < maxRetries. */
  getPending(maxRetries: number = 3): PendingInvoice[] {
    return db
      .select()
      .from(pendingInvoices)
      .where(lte(pendingInvoices.retryCount, maxRetries - 1))
      .all()
      .map(this.rowToModel);
  }

  /** Incrementa retryCount y registra el error. */
  recordFailure(id: number, errorMessage: string): void {
    const row = db
      .select()
      .from(pendingInvoices)
      .where(eq(pendingInvoices.id, id))
      .get();
    if (!row) return;

    db.update(pendingInvoices)
      .set({
        retryCount: row.retryCount + 1,
        lastRetryAt: new Date().toISOString(),
        errorMessage,
      })
      .where(eq(pendingInvoices.id, id))
      .run();
  }

  /** Elimina la entrada una vez que la factura fue emitida con éxito. */
  remove(id: number): void {
    db.delete(pendingInvoices).where(eq(pendingInvoices.id, id)).run();
  }

  removeBySaleId(saleId: number): void {
    db.delete(pendingInvoices).where(eq(pendingInvoices.saleId, saleId)).run();
  }

  getBySaleId(saleId: number): PendingInvoice | null {
    const row = db
      .select()
      .from(pendingInvoices)
      .where(eq(pendingInvoices.saleId, saleId))
      .get();
    return row ? this.rowToModel(row) : null;
  }

  private rowToModel(row: typeof pendingInvoices.$inferSelect): PendingInvoice {
    return {
      id: row.id,
      saleId: row.saleId,
      businessUnitId: row.businessUnitId,
      invoiceType: row.invoiceType as 'B' | 'C',
      retryCount: row.retryCount,
      lastRetryAt: row.lastRetryAt,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
    };
  }
}
