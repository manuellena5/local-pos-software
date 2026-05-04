import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const syncQueue = sqliteTable('sync_queue', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  entityType:     text('entity_type').notNull(),  // 'product' | 'sale' | 'stock'
  entityId:       integer('entity_id').notNull(),
  action:         text('action').notNull(),        // 'upsert' | 'delete'
  businessUnitId: integer('business_unit_id').notNull(),
  payload:        text('payload').notNull(),       // JSON
  attempts:       integer('attempts').notNull().default(0),
  lastError:      text('last_error'),
  createdAt:      text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const syncLogs = sqliteTable('sync_logs', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  status:     text('status').notNull(),  // 'ok' | 'error' | 'partial'
  synced:     integer('synced').notNull().default(0),
  failed:     integer('failed').notNull().default(0),
  errorMsg:   text('error_msg'),
  durationMs: integer('duration_ms'),
  createdAt:  text('created_at').notNull().default(sql`(datetime('now'))`),
});

export type SyncQueueRow = typeof syncQueue.$inferSelect;
export type SyncLogRow   = typeof syncLogs.$inferSelect;
