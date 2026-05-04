-- Migration 0008: add locality and province to customers
-- Idempotent: ALTER TABLE ignores "duplicate column name" errors at app level

ALTER TABLE customers ADD COLUMN locality TEXT;
ALTER TABLE customers ADD COLUMN province TEXT;
