import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { businessUnits } from '../../core/installation';

export const PAYMENT_TERMS = ['contado', '15dias', '30dias', '60dias', 'otro'] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const suppliers = sqliteTable(
  'suppliers',
  {
    id:             integer('id').primaryKey({ autoIncrement: true }),
    businessUnitId: integer('business_unit_id').notNull().references(() => businessUnits.id),
    name:           text('name').notNull(),
    contactName:    text('contact_name'),
    phone:          text('phone'),
    email:          text('email'),
    paymentTerms:   text('payment_terms', { enum: PAYMENT_TERMS }),
    deliveryDays:   integer('delivery_days'),
    notes:          text('notes'),
    isActive:       integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt:      text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt:      text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    uniqueNameBU: uniqueIndex('suppliers_name_bu_unique').on(t.name, t.businessUnitId),
  }),
);

export type SupplierRow = typeof suppliers.$inferSelect;
