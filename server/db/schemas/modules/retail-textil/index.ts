import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from '../../core/products';

export const productAttributes = sqliteTable('product_attributes', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  key:       text('key').notNull(),
  value:     text('value').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const productImages = sqliteTable('product_images', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  filePath:  text('file_path').notNull(),
  altText:   text('alt_text'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const productVariants = sqliteTable('product_variants', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  productId:       integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  businessUnitId:  integer('business_unit_id').notNull(),
  attributeType:   text('attribute_type').notNull(),
  attributeValue:  text('attribute_value').notNull(),
  price:           real('price').notNull(),
  costPrice:       real('cost_price').notNull().default(0),
  sku:             text('sku'),
  barcode:         text('barcode'),
  stock:           integer('stock').notNull().default(0),
  isActive:        integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt:       text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt:       text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type ProductImage     = typeof productImages.$inferSelect;
export type ProductVariantRow = typeof productVariants.$inferSelect;
