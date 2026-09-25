/*
# Add insurance premium field to vehicles

1. Modified Tables
- `vehicles`: adds `insurance_premium` column (numeric, nullable) to store the annual insurance premium amount in euros.
2. Security
- No RLS changes needed; the vehicles table already has policies in place.
*/

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS insurance_premium numeric(10, 2);
