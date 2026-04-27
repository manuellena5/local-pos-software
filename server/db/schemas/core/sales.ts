import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { businessUnits, users } from './installation';
import { products } from './products';

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessUnitId: integer('business_unit_id')
    .notNull()
    .references(() => businessUnits.id),
  userId: integer('user_id').references(() => users.id),
  saleNumber: integer('sale_number').notNull(),
  subtotal: real('subtotal').notNull(),
  discountAmount: real('discount_amount').notNull().default(0),
  discountPercent: real('discount_percent').notNull().default(0),
  taxableAmount: real('taxable_amount').notNull(),
  taxRate: real('tax_rate').notNull().default(21),
  taxAmount: real('tax_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  // JSON string: [{method: "cash", amount: 1000}, ...]
  paymentMethods: text('payment_methods').notNull(),
  status: text('status', { enum: ['completed', 'cancelled'] })
    .notNull()
    .default('completed'),
  // Reservado para Fase 4 (AFIP)
  invoiceNumber: text('invoice_number'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id')
    .notNull()
    .references(() => sales.id),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  // Snapshot inmutable del nombre al momento de la venta
  productName: text('product_name').notNull().default(''),
  quantity: integer('quantity').notNull(),
  // Snapshot del precio al momento de la venta (inmutable)
  unitPrice: real('unit_price').notNull(),
  taxRate: real('tax_rate').notNull().default(21),
  discountPercent: real('discount_percent').notNull().default(0),
  lineTotal: real('line_total').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type SaleRow = typeof sales.$inferSelect;
export type SaleItemRow = typeof saleItems.$inferSelect;
