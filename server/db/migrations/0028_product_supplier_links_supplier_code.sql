-- Agrega supplier_code al link para persistir el código del proveedor al momento de la vinculación
ALTER TABLE product_supplier_links ADD COLUMN supplier_code TEXT;
