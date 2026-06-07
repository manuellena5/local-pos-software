-- Campos fiscales completos en installation_config
-- address_street y address_city separan la dirección en dos campos más precisos.
-- fiscal_condition permite distinguir monotributo de responsable inscripto.
-- ing_brutos ya existe desde 0024, estas son las columnas faltantes.
ALTER TABLE installation_config ADD COLUMN address_street TEXT;
ALTER TABLE installation_config ADD COLUMN address_city   TEXT;
ALTER TABLE installation_config ADD COLUMN fiscal_condition TEXT NOT NULL DEFAULT 'monotributo';
