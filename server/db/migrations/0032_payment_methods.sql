-- Medios de pago editables (Configuración → Medios de pago).
-- `code` coincide con los valores fijos ya usados en sales/cash_movements
-- (cash, transfer, mercadopago, card, other) — is_active solo controla
-- cuáles se ofrecen en los selectores de la UI (POS, movimientos manuales).

CREATE TABLE IF NOT EXISTS payment_methods (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  label       TEXT    NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
