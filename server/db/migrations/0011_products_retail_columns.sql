-- Columnas adicionales para retail-textil (migration aditiva — no modifica schema core)
ALTER TABLE products ADD COLUMN code TEXT;
ALTER TABLE products ADD COLUMN show_in_catalog INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN catalog_description TEXT;
