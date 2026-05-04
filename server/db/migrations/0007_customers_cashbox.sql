-- Fase 5: Clientes
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  document_type TEXT,
  document TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  credit_limit REAL NOT NULL DEFAULT 0,
  credit_used REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_document_unique ON customers(document) WHERE document IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name);

-- Fase 5: Vincular ventas a clientes
ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id);

-- Fase 5: Movimientos de caja
CREATE TABLE IF NOT EXISTS cash_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  sale_id INTEGER REFERENCES sales(id),
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS cash_movements_bu_date_idx ON cash_movements(business_unit_id, created_at);
CREATE INDEX IF NOT EXISTS cash_movements_sale_idx ON cash_movements(sale_id);

-- Fase 5: Arqueos de caja
CREATE TABLE IF NOT EXISTS cash_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  audit_date TEXT NOT NULL,
  theoretical_balance REAL NOT NULL,
  real_balance REAL NOT NULL,
  difference REAL NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'balanced',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS cash_audits_bu_date_idx ON cash_audits(business_unit_id, audit_date);
