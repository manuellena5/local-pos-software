-- Soporte de variantes en ventas: persistir qué variante se vendió
-- para poder descontar/revertir su stock con trazabilidad.
ALTER TABLE sale_items ADD COLUMN variant_id INTEGER;

-- Reparación de datos: las variantes deben heredar la business_unit del producto.
-- Versiones anteriores guardaban la BU activa del frontend, lo que rompía
-- la búsqueda POS y la vinculación con stock_items.
UPDATE product_variants
SET business_unit_id = (
  SELECT business_unit_id FROM products WHERE products.id = product_variants.product_id
)
WHERE EXISTS (
  SELECT 1 FROM products
  WHERE products.id = product_variants.product_id
    AND products.business_unit_id != product_variants.business_unit_id
);
