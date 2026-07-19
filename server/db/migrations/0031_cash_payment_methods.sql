-- Paso 1: agregar columna payment_method a cash_movements
-- Los registros existentes quedan como 'cash' por defecto
ALTER TABLE cash_movements
  ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash','transfer','mercadopago','card','other'));

-- Backfill: movimientos de tipo 'sale' toman el método del primer ítem de la venta original
UPDATE cash_movements
SET payment_method = CASE
    json_extract(
      (SELECT payment_methods FROM sales WHERE sales.id = cash_movements.sale_id),
      '$[0].method')
  WHEN 'cash'        THEN 'cash'
  WHEN 'transfer'    THEN 'transfer'
  WHEN 'mercadopago' THEN 'mercadopago'
  WHEN 'card'        THEN 'card'
  ELSE 'other'
END
WHERE type = 'sale' AND sale_id IS NOT NULL;

-- Paso 2: agregar other_methods_total a cash_audits
-- Guarda la suma de métodos no-efectivo al momento del arqueo (solo informativo)
ALTER TABLE cash_audits
  ADD COLUMN other_methods_total REAL NOT NULL DEFAULT 0;
