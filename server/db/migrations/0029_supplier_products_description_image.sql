-- Agrega descripcion y nombre de imagen a los productos de proveedores
ALTER TABLE supplier_products ADD COLUMN description TEXT;
ALTER TABLE supplier_products ADD COLUMN image_name TEXT;
