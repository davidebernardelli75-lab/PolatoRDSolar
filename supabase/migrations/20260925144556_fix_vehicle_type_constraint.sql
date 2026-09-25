/*
# Fix vehicles type CHECK constraint to include Motoveicolo

1. Modified Tables
   - `vehicles`: the original CHECK constraint only allowed 'Auto' and 'Furgone'.
     The frontend also supports 'Motoveicolo', but saving a vehicle of that type
     was silently rejected by the database. This migration drops the old
     constraint and creates a new one that includes all three types.

2. Security
   - No policy changes needed — existing RLS policies are unaffected.
*/

ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check;

ALTER TABLE vehicles ADD CONSTRAINT vehicles_type_check
  CHECK (type IN ('Auto', 'Furgone', 'Motoveicolo'));
