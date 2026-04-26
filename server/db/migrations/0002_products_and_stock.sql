-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sku TEXT NOT NULL,
  cost_price REAL NOT NULL,
  base_price REAL NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 21,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS products_bu_active_idx ON products (business_unit_id, is_active);

-- Stock items table
CREATE TABLE IF NOT EXISTS stock_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  minimum_threshold INTEGER NOT NULL DEFAULT 5,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS stock_items_bu_product_idx ON stock_items (business_unit_id, product_id);

-- Stock movements table (audit log, immutable)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  type TEXT NOT NULL CHECK (type IN ('entry', 'sale', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS stock_movements_bu_created_idx ON stock_movements (business_unit_id, created_at);
