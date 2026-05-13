import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { businessUnits } from '../core/installation';
import { suppliers } from './suppliers/index';

export const supplierProducts = sqliteTable(
  'supplier_products',
  {
    id:           integer('id').primaryKey({ autoIncrement: true }),
    supplierId:   integer('supplier_id').notNull().references(() => suppliers.id),
    businessUnitId: integer('business_unit_id').notNull().references(() => businessUnits.id),
    name:         text('name').notNull(),
    supplierCode: text('supplier_code'),
    unitCost:     real('unit_cost').notNull(),
    currency:     text('currency').notNull().default('ARS'),
    unit:         text('unit').notNull().default('unidad'),
    categoryHint: text('category_hint'),
    isActive:     integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastUpdated:  text('last_updated').notNull().default(sql`(datetime('now'))`),
    createdAt:    text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    uniqueCodeBU: uniqueIndex('sp_supplier_code_unique')
      .on(t.supplierId, t.supplierCode)
      .where(sql`${t.supplierCode} IS NOT NULL`),
  }),
);
