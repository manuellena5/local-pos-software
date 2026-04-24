import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const installationConfig = sqliteTable('installation_config', {
  id: integer('id').primaryKey(),
  businessName: text('business_name').notNull(),
  cuit: text('cuit').notNull().default(''),
  address: text('address').notNull().default(''),
  logoPath: text('logo_path'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const businessUnits = sqliteTable('business_units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  installationId: integer('installation_id')
    .notNull()
    .references(() => installationConfig.id),
  name: text('name').notNull(),
  moduleId: text('module_id').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  invoicePrefix: text('invoice_prefix').notNull().default('A'),
  lastInvoiceNumber: integer('last_invoice_number').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  installationId: integer('installation_id')
    .notNull()
    .references(() => installationConfig.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'cashier'] })
    .notNull()
    .default('cashier'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type InstallationConfigRow = typeof installationConfig.$inferSelect;
export type BusinessUnitRow = typeof businessUnits.$inferSelect;
export type UserRow = typeof users.$inferSelect;
