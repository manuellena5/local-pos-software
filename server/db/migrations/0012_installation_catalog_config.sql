-- Configuración del catálogo web en installation_config
ALTER TABLE installation_config ADD COLUMN whatsapp_number TEXT;
ALTER TABLE installation_config ADD COLUMN catalog_business_unit_id INTEGER;
