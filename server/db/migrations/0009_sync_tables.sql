-- Migration 0009: sync_queue y sync_logs para Fase 6 (offline-first)

CREATE TABLE IF NOT EXISTS sync_queue (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type      TEXT    NOT NULL,           -- 'product' | 'sale' | 'stock'
  entity_id        INTEGER NOT NULL,
  action           TEXT    NOT NULL,           -- 'upsert' | 'delete'
  business_unit_id INTEGER NOT NULL,
  payload          TEXT    NOT NULL,           -- JSON serializado
  attempts         INTEGER NOT NULL DEFAULT 0,
  last_error       TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status
  ON sync_queue (business_unit_id, entity_type, created_at);

CREATE TABLE IF NOT EXISTS sync_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  status      TEXT    NOT NULL,               -- 'ok' | 'error' | 'partial'
  synced      INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  error_msg   TEXT,
  duration_ms INTEGER,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
