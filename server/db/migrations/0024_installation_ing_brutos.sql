-- Agrega campo ing_brutos a installation_config (Ingresos Brutos del monotributista)
ALTER TABLE installation_config ADD COLUMN ing_brutos TEXT NOT NULL DEFAULT '';
