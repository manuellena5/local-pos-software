import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { customers } from '../../core/customers';
import { businessUnits } from '../../core/installation';

export const ORDER_STATUSES = [
  'presupuestado',
  'confirmado',
  'en_confeccion',
  'en_prueba',
  'listo',
  'entregado',
  'cancelado',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_TYPES = ['sena', 'saldo', 'parcial'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const tallerOrders = sqliteTable('taller_orders', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  buId:             integer('bu_id').notNull().references(() => businessUnits.id),
  customerId:       integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerName:     text('customer_name').notNull(),
  description:      text('description').notNull(),
  status:           text('status', { enum: ORDER_STATUSES }).notNull().default('presupuestado'),
  totalAmount:      real('total_amount').notNull().default(0),
  estimatedDelivery: text('estimated_delivery'),
  notes:            text('notes'),
  createdAt:        text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt:        text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const tallerOrderPayments = sqliteTable('taller_order_payments', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  orderId:     integer('order_id').notNull().references(() => tallerOrders.id, { onDelete: 'cascade' }),
  amount:      real('amount').notNull(),
  paymentType: text('payment_type', { enum: PAYMENT_TYPES }).notNull(),
  notes:       text('notes'),
  paidAt:      text('paid_at').notNull().default(sql`(datetime('now'))`),
});

// Medidas del cliente almacenadas como JSON flexible (cada taller define sus campos)
export const tallerClientMeasurements = sqliteTable('taller_client_measurements', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  buId:       integer('bu_id').notNull().references(() => businessUnits.id),
  fields:     text('fields').notNull().default('{}'), // JSON
  updatedAt:  text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export type TallerOrder           = typeof tallerOrders.$inferSelect;
export type TallerOrderPayment    = typeof tallerOrderPayments.$inferSelect;
export type TallerClientMeasurements = typeof tallerClientMeasurements.$inferSelect;
