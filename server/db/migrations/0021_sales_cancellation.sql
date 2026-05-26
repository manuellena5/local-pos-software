-- Fase: Pantalla Ventas (RF-POS-08)
-- Agrega metadatos de cancelación a la tabla sales.
-- Todas las columnas son nullable para retrocompatibilidad con ventas existentes.

ALTER TABLE sales ADD COLUMN cancelled_at TEXT;
ALTER TABLE sales ADD COLUMN cancellation_reason TEXT;
ALTER TABLE sales ADD COLUMN cancelled_by INTEGER REFERENCES users(id);
