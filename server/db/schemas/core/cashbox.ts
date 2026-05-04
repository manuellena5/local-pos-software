import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { businessUnits, users } from './installation';
import { sales } from './sales';

export const cashMovements = sqliteTable('cash_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  businessUnitId: integer('business_unit_id')
    .notNull()
    .references(() => businessUnits.id),

  /** Positivo = ingresa a caja, Negativo = sale de caja */
  type: text('type', {
    enum: ['sale', 'refund', 'deposit', 'withdrawal', 'other'],
  }).notNull(),

  /** Siempre positivo — el tipo determina el signo contable */
  amount: real('amount').notNull(),

  description: text('description').notNull(),

  /** Venta asociada (solo para type='sale' o 'refund') */
  saleId: integer('sale_id').references(() => sales.id),

  userId: integer('user_id').references(() => users.id),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const cashAudits = sqliteTable('cash_audits', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  businessUnitId: integer('business_unit_id')
    .notNull()
    .references(() => businessUnits.id),

  /** Fecha del arqueo YYYY-MM-DD */
  auditDate: text('audit_date').notNull(),

  /** Suma teórica de todos los movimientos hasta la fecha */
  theoreticalBalance: real('theoretical_balance').notNull(),

  /** Balance real reportado por el operador */
  realBalance: real('real_balance').notNull(),

  /** realBalance - theoreticalBalance (puede ser negativo) */
  difference: real('difference').notNull(),

  notes: text('notes'),

  status: text('status', {
    enum: ['balanced', 'discrepancy', 'discrepancy_resolved'],
  })
    .notNull()
    .default('balanced'),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type CashMovementRow = typeof cashMovements.$inferSelect;
export type CashAuditRow = typeof cashAudits.$inferSelect;
