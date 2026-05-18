-- Fase 10 Pasos 4-5: vínculos producto ↔ producto de proveedor

CREATE TABLE IF NOT EXISTS product_supplier_links (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id          INTEGER NOT NULL REFERENCES products(id),
  supplier_product_id INTEGER NOT NULL REFERENCES supplier_products(id),
  business_unit_id    INTEGER NOT NULL REFERENCES business_units(id),
  is_preferred        INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS psl_product_supplier_unique
  ON product_supplier_links (product_id, supplier_product_id);
