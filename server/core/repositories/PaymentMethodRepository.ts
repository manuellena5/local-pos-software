import { eq, asc } from 'drizzle-orm';
import { db } from '../../db/connection';
import { paymentMethods } from '../../db/schema';
import type { PaymentMethodConfig } from '../../../shared/types';

function rowToPaymentMethod(row: typeof paymentMethods.$inferSelect): PaymentMethodConfig {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

export class PaymentMethodRepository {
  /** Todos los medios, ordenados por sortOrder — incluye inactivos (para Configuración). */
  findAll(): PaymentMethodConfig[] {
    return db
      .select()
      .from(paymentMethods)
      .orderBy(asc(paymentMethods.sortOrder))
      .all()
      .map(rowToPaymentMethod);
  }

  /** Solo los activos, ordenados — para poblar selectores de la UI (POS, caja). */
  findAllActive(): PaymentMethodConfig[] {
    return this.findAll().filter((m) => m.isActive);
  }

  findById(id: number): PaymentMethodConfig | null {
    const row = db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).get();
    return row ? rowToPaymentMethod(row) : null;
  }

  findByCode(code: string): PaymentMethodConfig | null {
    const row = db.select().from(paymentMethods).where(eq(paymentMethods.code, code)).get();
    return row ? rowToPaymentMethod(row) : null;
  }

  /** Upsert idempotente por `code` — usado por el seed del sistema. */
  upsertByCode(data: { code: string; label: string; sortOrder: number }): void {
    const existing = this.findByCode(data.code);
    if (existing) {
      db.update(paymentMethods)
        .set({ label: data.label, sortOrder: data.sortOrder })
        .where(eq(paymentMethods.code, data.code))
        .run();
      return;
    }
    db.insert(paymentMethods).values(data).run();
  }

  setActive(id: number, isActive: boolean): PaymentMethodConfig {
    const result = db
      .update(paymentMethods)
      .set({ isActive })
      .where(eq(paymentMethods.id, id))
      .returning()
      .get();
    return rowToPaymentMethod(result);
  }
}
