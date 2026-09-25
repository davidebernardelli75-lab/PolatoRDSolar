/*
# Add gas cylinders and methane inspection expiry fields to vehicles

1. Modified Tables
   - `vehicles`: add `gas_cylinders_inspection_expiry` (date, nullable) — scadenza revisione bombole gas (ogni 10 anni)
   - `vehicles`: add `methane_inspection_expiry` (date, nullable) — scadenza revisione metano (prima revisione dopo 4 anni per auto nuova, poi ogni 2 anni)

2. Security
   - No policy changes needed — existing RLS policies already cover the new columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'gas_cylinders_inspection_expiry') THEN
    ALTER TABLE vehicles ADD COLUMN gas_cylinders_inspection_expiry date DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'methane_inspection_expiry') THEN
    ALTER TABLE vehicles ADD COLUMN methane_inspection_expiry date DEFAULT NULL;
  END IF;
END $$;
