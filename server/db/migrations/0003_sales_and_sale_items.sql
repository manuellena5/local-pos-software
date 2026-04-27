-- Migración Fase 3: sales, sale_items
-- Idempotente: usa CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS "sales" (
  "id"               INTEGER PRIMARY KEY AUTOINCREMENT,
  "business_unit_id" INTEGER NOT NULL REFERENCES "business_units"("id"),
  "user_id"          INTEGER REFERENCES "users"("id"),
  "sale_number"      INTEGER NOT NULL,
  "subtotal"         REAL    NOT NULL,
  "discount_amount"  REAL    NOT NULL DEFAULT 0,
  "discount_percent" REAL    NOT NULL DEFAULT 0,
  "taxable_amount"   REAL    NOT NULL,
  "tax_rate"         REAL    NOT NULL DEFAULT 21,
  "tax_amount"       REAL    NOT NULL,
  "total_amount"     REAL    NOT NULL,
  "payment_methods"  TEXT    NOT NULL,
  "status"           TEXT    NOT NULL DEFAULT 'completed',
  "invoice_number"   TEXT,
  "created_at"       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "sales_bu_date_idx"
  ON "sales" ("business_unit_id", "created_at");

CREATE INDEX IF NOT EXISTS "sales_bu_number_idx"
  ON "sales" ("business_unit_id", "sale_number");

CREATE TABLE IF NOT EXISTS "sale_items" (
  "id"               INTEGER PRIMARY KEY AUTOINCREMENT,
  "sale_id"          INTEGER NOT NULL REFERENCES "sales"("id"),
  "product_id"       INTEGER NOT NULL REFERENCES "products"("id"),
  "quantity"         INTEGER NOT NULL,
  "unit_price"       REAL    NOT NULL,
  "tax_rate"         REAL    NOT NULL DEFAULT 21,
  "discount_percent" REAL    NOT NULL DEFAULT 0,
  "line_total"       REAL    NOT NULL,
  "created_at"       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "sale_items_sale_idx"
  ON "sale_items" ("sale_id");
