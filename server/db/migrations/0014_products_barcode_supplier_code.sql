-- Fase 9 post-launch: campos de identificación adicionales en productos
-- barcode      → código de barras EAN/UPC (escaneable en POS)
-- supplier_code → código del proveedor en su propio catálogo (referencia interna)
ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE products ADD COLUMN supplier_code TEXT;
