import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from '../core/products';
import { supplierProducts } from './supplierProducts';
import { businessUnits } from '../core/installation';

export const productSupplierLinks = sqliteTable(
  'product_supplier_links',
  {
    id:                integer('id').primaryKey({ autoIncrement: true }),
    productId:         integer('product_id').notNull().references(() => products.id),
    supplierProductId: integer('supplier_product_id').notNull().references(() => supplierProducts.id),
    businessUnitId:    integer('business_unit_id').notNull().references(() => businessUnits.id),
    isPreferred:       integer('is_preferred').notNull().default(0),
    createdAt:         text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    uniqueProductSupplier: uniqueIndex('psl_product_supplier_unique').on(t.productId, t.supplierProductId),
  }),
);

export type ProductSupplierLinkRow = typeof productSupplierLinks.$inferSelect;
