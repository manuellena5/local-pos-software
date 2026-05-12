import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    businessUnitId: integer('business_unit_id').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    uniqueNameBU: uniqueIndex('categories_name_bu_unique').on(t.name, t.businessUnitId),
  }),
);

export type CategoryRow = typeof categories.$inferSelect;
