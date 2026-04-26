-- Migración inicial: installation_config, business_units, users
-- Idempotente: usa CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS "installation_config" (
  "id"            INTEGER PRIMARY KEY DEFAULT 1,
  "business_name" TEXT    NOT NULL,
  "cuit"          TEXT    NOT NULL DEFAULT '',
  "address"       TEXT    NOT NULL DEFAULT '',
  "logo_path"     TEXT,
  "created_at"    TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "business_units" (
  "id"                  INTEGER PRIMARY KEY AUTOINCREMENT,
  "installation_id"     INTEGER NOT NULL REFERENCES "installation_config"("id"),
  "name"                TEXT    NOT NULL,
  "module_id"           TEXT    NOT NULL,
  "is_active"           INTEGER NOT NULL DEFAULT 1,
  "invoice_prefix"      TEXT    NOT NULL DEFAULT 'A',
  "last_invoice_number" INTEGER NOT NULL DEFAULT 0,
  "created_at"          TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE("installation_id", "name")
);

CREATE INDEX IF NOT EXISTS "bu_installation_idx" ON "business_units" ("installation_id");

CREATE TABLE IF NOT EXISTS "users" (
  "id"              INTEGER PRIMARY KEY AUTOINCREMENT,
  "installation_id" INTEGER NOT NULL REFERENCES "installation_config"("id"),
  "email"           TEXT    NOT NULL UNIQUE,
  "password_hash"   TEXT    NOT NULL,
  "role"            TEXT    NOT NULL DEFAULT 'cashier',
  "is_active"       INTEGER NOT NULL DEFAULT 1,
  "created_at"      TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "users_installation_idx" ON "users" ("installation_id");
