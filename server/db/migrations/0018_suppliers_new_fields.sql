-- Fase 10 Paso 3 (campos adicionales): minimumOrder, shippingCost, city

ALTER TABLE suppliers ADD COLUMN minimum_order REAL;
ALTER TABLE suppliers ADD COLUMN shipping_cost REAL;
ALTER TABLE suppliers ADD COLUMN city          TEXT;
