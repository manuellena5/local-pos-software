-- Migration 0004: Add product_name snapshot column to sale_items
-- Almacena el nombre del producto al momento de la venta (snapshot inmutable).
-- initDatabase() maneja el caso de columna ya existente (duplicate column name).
ALTER TABLE sale_items ADD COLUMN product_name TEXT NOT NULL DEFAULT ''
