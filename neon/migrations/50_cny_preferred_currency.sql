-- The legacy profile constraint excluded CNY. Keep existing preferences intact.
ALTER TABLE IF EXISTS profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_currency_check;

ALTER TABLE IF EXISTS profiles
  ADD CONSTRAINT profiles_preferred_currency_check
  CHECK (preferred_currency IN ('cny', 'eur', 'usd', 'gbp', 'chf'));
