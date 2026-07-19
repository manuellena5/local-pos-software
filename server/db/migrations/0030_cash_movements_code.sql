-- Add code column to cash_movements for session identification
ALTER TABLE cash_movements ADD COLUMN code TEXT;

-- Backfill: assign CAJA-YYYYMMDD to each opening movement.
-- Same-day/same-BU duplicates get a -2, -3, ... suffix.
UPDATE cash_movements
SET code = (
  SELECT
    CASE WHEN ranked.rn = 1
      THEN 'CAJA-' || ranked.day
      ELSE 'CAJA-' || ranked.day || '-' || CAST(ranked.rn AS TEXT)
    END
  FROM (
    SELECT
      id,
      strftime('%Y%m%d', created_at) AS day,
      business_unit_id,
      ROW_NUMBER() OVER (
        PARTITION BY business_unit_id, strftime('%Y%m%d', created_at)
        ORDER BY id
      ) AS rn
    FROM cash_movements
    WHERE type = 'opening'
  ) AS ranked
  WHERE ranked.id = cash_movements.id
)
WHERE type = 'opening';
