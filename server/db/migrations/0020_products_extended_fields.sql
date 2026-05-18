-- Fase 10 Paso 4: campos extendidos en products y unitCost en stock_movements

ALTER TABLE products ADD COLUMN minimum_sale_price REAL;
ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN supplier_lead_time INTEGER;
ALTER TABLE products ADD COLUMN show_catalog_price INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN show_catalog_stock INTEGER NOT NULL DEFAULT 0;

ALTER TABLE stock_movements ADD COLUMN unit_cost REAL;
