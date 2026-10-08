-- New launch receipts are denominated in CNY. Existing USD history stays intact.
ALTER TABLE IF EXISTS app_receipts
  ALTER COLUMN currency SET DEFAULT 'CNY';
