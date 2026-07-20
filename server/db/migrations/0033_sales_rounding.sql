-- Redondeo de efectivo al cobrar (comercial, no fiscal).
-- rounding_multiple en installation_config: múltiplo configurable, 0 = desactivado (default $50).
-- rounding_adjustment en sales: ajuste aplicado (siempre <= 0, floor a favor del cliente).
-- sales.total_amount ya es el monto REALMENTE cobrado (redondeado si aplica);
-- subtotal/taxable_amount quedan sin redondear para trazabilidad.
ALTER TABLE installation_config ADD COLUMN rounding_multiple INTEGER NOT NULL DEFAULT 50;
ALTER TABLE sales ADD COLUMN rounding_adjustment REAL NOT NULL DEFAULT 0;
