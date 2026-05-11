-- Módulo taller-medida: pedidos a medida, cobros fraccionados y fichas de medidas

CREATE TABLE IF NOT EXISTS taller_orders (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  bu_id              INTEGER NOT NULL REFERENCES business_units(id),
  customer_id        INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name      TEXT    NOT NULL,
  description        TEXT    NOT NULL,
  status             TEXT    NOT NULL DEFAULT 'presupuestado',
  total_amount       REAL    NOT NULL DEFAULT 0,
  estimated_delivery TEXT,
  notes              TEXT,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_taller_orders_bu_id     ON taller_orders(bu_id);
CREATE INDEX IF NOT EXISTS idx_taller_orders_status    ON taller_orders(status);
CREATE INDEX IF NOT EXISTS idx_taller_orders_customer  ON taller_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_taller_orders_delivery  ON taller_orders(estimated_delivery);

CREATE TABLE IF NOT EXISTS taller_order_payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES taller_orders(id) ON DELETE CASCADE,
  amount       REAL    NOT NULL,
  payment_type TEXT    NOT NULL,
  notes        TEXT,
  paid_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_taller_payments_order ON taller_order_payments(order_id);

CREATE TABLE IF NOT EXISTS taller_client_measurements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bu_id       INTEGER NOT NULL REFERENCES business_units(id),
  fields      TEXT    NOT NULL DEFAULT '{}',
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(customer_id, bu_id)
);

CREATE INDEX IF NOT EXISTS idx_taller_measurements_customer ON taller_client_measurements(customer_id);
