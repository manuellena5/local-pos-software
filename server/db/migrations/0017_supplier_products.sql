-- Fase 10 Paso 3: catálogo de productos por proveedor

CREATE TABLE IF NOT EXISTS supplier_products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id      INTEGER NOT NULL REFERENCES suppliers(id),
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  name             TEXT NOT NULL,
  supplier_code    TEXT,
  unit_cost        REAL NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'ARS',
  unit             TEXT NOT NULL DEFAULT 'unidad',
  category_hint    TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  last_updated     TEXT NOT NULL DEFAULT (datetime('now')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS sp_supplier_code_unique
  ON supplier_products (supplier_id, supplier_code)
  WHERE supplier_code IS NOT NULL;
