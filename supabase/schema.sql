-- ── Supabase Schema — local-pos-software ─────────────────────────────────────
-- Ejecutar en el SQL Editor de Supabase.
-- Estas tablas reciben datos sincronizados desde la instalación local.

-- Productos sincronizados (snapshot de catálogo)
CREATE TABLE IF NOT EXISTS products (
  id               BIGINT PRIMARY KEY,
  business_unit_id BIGINT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT,
  sku              TEXT NOT NULL,
  base_price       NUMERIC(10, 2) NOT NULL,
  tax_rate         NUMERIC(5, 2) NOT NULL DEFAULT 21,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_bu ON products (business_unit_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (business_unit_id, sku);

-- Resumen de ventas diarias por unidad de negocio
CREATE TABLE IF NOT EXISTS sales_summary (
  id               BIGSERIAL PRIMARY KEY,
  business_unit_id BIGINT NOT NULL,
  date             DATE NOT NULL,
  total_sales      BIGINT NOT NULL DEFAULT 0,
  total_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_unit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sales_summary_bu_date ON sales_summary (business_unit_id, date DESC);

-- Resumen de stock por producto
CREATE TABLE IF NOT EXISTS stock_summary (
  id               BIGSERIAL PRIMARY KEY,
  business_unit_id BIGINT NOT NULL,
  product_id       BIGINT NOT NULL,
  product_name     TEXT NOT NULL,
  sku              TEXT NOT NULL,
  quantity         BIGINT NOT NULL DEFAULT 0,
  minimum_threshold BIGINT NOT NULL DEFAULT 5,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_unit_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_summary_bu ON stock_summary (business_unit_id);

-- Row Level Security (opcional pero recomendado)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_summary ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_summary ENABLE ROW LEVEL SECURITY;
