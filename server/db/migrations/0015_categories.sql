-- Fase 10: tabla de categorías de productos
-- Convierte las categorías de texto libre en una entidad propia por BU.

CREATE TABLE IF NOT EXISTS categories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_bu_unique
  ON categories (name, business_unit_id);

-- Migración de datos: normalizar y deduplicar las categorías existentes en products.
-- Normalización: trim() + primera letra mayúscula + resto minúsculas.
-- Se agrupa por (category normalizada, business_unit_id) para insertar una sola vez.
INSERT OR IGNORE INTO categories (name, business_unit_id)
SELECT
  -- Capitalizar: primera letra upper, resto lower
  upper(substr(trim(category), 1, 1)) || lower(substr(trim(category), 2)) AS name,
  business_unit_id
FROM products
WHERE category IS NOT NULL
  AND trim(category) != ''
GROUP BY
  upper(substr(trim(category), 1, 1)) || lower(substr(trim(category), 2)),
  business_unit_id;
