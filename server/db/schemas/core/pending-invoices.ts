import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { businessUnits } from './installation';
import { sales } from './sales';

/**
 * Cola de facturas pendientes de emitir contra AFIP.
 * Se crea cuando la venta se registra pero AFIP no está disponible o falla.
 * El job InvoiceProcessor las procesa cada 5 minutos.
 */
export const pendingInvoices = sqliteTable('pending_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  /** Venta asociada — única (una venta, una factura pendiente) */
  saleId: integer('sale_id')
    .notNull()
    .unique()
    .references(() => sales.id),

  businessUnitId: integer('business_unit_id')
    .notNull()
    .references(() => businessUnits.id),

  /** Tipo de comprobante: B = consumidor final, C = monotributo */
  invoiceType: text('invoice_type', { enum: ['B', 'C'] }).notNull().default('B'),

  /** Cantidad de reintentos realizados (máximo 3) */
  retryCount: integer('retry_count').notNull().default(0),

  lastRetryAt: text('last_retry_at'),

  /** Último error recibido de AFIP */
  errorMessage: text('error_message'),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type PendingInvoiceRow = typeof pendingInvoices.$inferSelect;
