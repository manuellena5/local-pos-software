-- Movimientos de stock por variante y con proveedor:
-- variant_id  → variante afectada (módulo retail-textil), null si no aplica
-- supplier_id → proveedor asociado al movimiento (entradas de mercadería)
ALTER TABLE stock_movements ADD COLUMN variant_id INTEGER;
ALTER TABLE stock_movements ADD COLUMN supplier_id INTEGER;
