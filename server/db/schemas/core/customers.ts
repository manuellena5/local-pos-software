import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  name: text('name').notNull(),

  /** DNI, CUIT o PASAPORTE */
  documentType: text('document_type', { enum: ['DNI', 'CUIT', 'PASAPORTE'] }),

  /** Número de documento (único si existe) */
  document: text('document'),

  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  locality: text('locality'),
  province: text('province'),
  notes: text('notes'),

  /** Límite de crédito disponible (0 = sin crédito) */
  creditLimit: real('credit_limit').notNull().default(0),

  /** Deuda acumulada — se actualiza al pagar con crédito */
  creditUsed: real('credit_used').notNull().default(0),

  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),

  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type CustomerRow = typeof customers.$inferSelect;
