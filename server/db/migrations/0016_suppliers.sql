-- Fase 10 Paso 2: módulo de proveedores
-- Tabla de proveedores por unidad de negocio.
-- paymentTerms: contado | 15dias | 30dias | 60dias | otro
-- deliveryDays: días hábiles estimados de entrega (nullable)

CREATE TABLE IF NOT EXISTS suppliers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  name             TEXT    NOT NULL,
  contact_name     TEXT,
  phone            TEXT,
  email            TEXT,
  payment_terms    TEXT CHECK (payment_terms IN ('contado','15dias','30dias','60dias','otro')),
  delivery_days    INTEGER,
  notes            TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_name_bu_unique
  ON suppliers (name, business_unit_id);
