/*
# Add insurance_type column to insurances table

1. Modified Tables
   - `insurances`: add `insurance_type` (text, nullable) — tipo polizza: 'Privata' o 'Aziendale'
     Used to display different icons in the dashboard (person vs building).

2. Security
   - No policy changes needed — existing RLS policies already cover the new column.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurances' AND column_name = 'insurance_type') THEN
    ALTER TABLE insurances ADD COLUMN insurance_type text DEFAULT NULL;
  END IF;
END $$;
