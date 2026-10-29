-- Campos extendidos para trazabilidad de movimientos de stock
ALTER TABLE stock_movements ADD COLUMN reason_label TEXT;
ALTER TABLE stock_movements ADD COLUMN quantity_before INTEGER;
ALTER TABLE stock_movements ADD COLUMN quantity_after INTEGER;
ALTER TABLE stock_movements ADD COLUMN notes TEXT;
