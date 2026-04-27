-- Migration 0005: Unique index on (business_unit_id, sku) for products
-- Garantiza que no haya SKUs duplicados por unidad de negocio.
-- CREATE UNIQUE INDEX IF NOT EXISTS es idempotente.
-- NOTA: Fallará si hay datos duplicados en la BD — en ese caso correr db:reset primero.
CREATE UNIQUE INDEX IF NOT EXISTS products_bu_sku_unique_idx ON products(business_unit_id, sku)
