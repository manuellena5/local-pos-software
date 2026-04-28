-- Fase 4: AFIP Electronic Invoicing fields on sales table
ALTER TABLE sales ADD COLUMN invoice_number TEXT;
ALTER TABLE sales ADD COLUMN cae TEXT;
ALTER TABLE sales ADD COLUMN cae_expiration TEXT;
ALTER TABLE sales ADD COLUMN invoice_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE sales ADD COLUMN invoice_error TEXT;
ALTER TABLE sales ADD COLUMN invoice_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN last_invoice_attempt_at TEXT;

-- Pending invoices queue
CREATE TABLE IF NOT EXISTS pending_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL UNIQUE REFERENCES sales(id),
  business_unit_id INTEGER NOT NULL REFERENCES business_units(id),
  invoice_type TEXT NOT NULL DEFAULT 'B',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS pending_invoices_business_unit_idx ON pending_invoices(business_unit_id);
