-- Módulo retail-textil: variantes de producto (RF-RT-01, RF-RT-02, RF-RT-05)

CREATE TABLE IF NOT EXISTS product_variants (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_unit_id INTEGER NOT NULL,
  attribute_type   TEXT    NOT NULL,
  attribute_value  TEXT    NOT NULL,
  price            REAL    NOT NULL,
  cost_price       REAL    NOT NULL DEFAULT 0,
  sku              TEXT,
  barcode          TEXT,
  stock            INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_bu ON product_variants(business_unit_id);
