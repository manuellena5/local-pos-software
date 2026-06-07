ALTER TABLE installation_config ADD COLUMN printer_config TEXT;
ALTER TABLE installation_config ADD COLUMN printer_enabled INTEGER NOT NULL DEFAULT 0;
