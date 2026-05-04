import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { businessUnits, users } from './installation';

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessUnitId: integer('business_unit_id')
    .notNull()
    .references(() => businessUnits.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  sku: text('sku').notNull(),
  costPrice: real('cost_price').notNull(),
  basePrice: real('base_price').notNull(),
  taxRate: real('tax_rate').notNull().default(21),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const stockItems = sqliteTable('stock_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  businessUnitId: integer('business_unit_id')
    .notNull()
    .references(() => businessUnits.id),
  quantity: integer('quantity').notNull().default(0),
  minimumThreshold: integer('minimum_threshold').notNull().default(5),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stockItemId: integer('stock_item_id')
    .notNull()
    .references(() => stockItems.id),
  businessUnitId: integer('business_unit_id')
    .notNull()
    .references(() => businessUnits.id),
  type: text('type', { enum: ['entry', 'sale', 'adjustment'] }).notNull(),
  quantity: integer('quantity').notNull(),
  reason: text('reason').notNull(),
  userId: integer('user_id').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export type Product = typeof products.$inferSelect;
export type StockItem = typeof stockItems.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
