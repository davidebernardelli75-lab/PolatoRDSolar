/*
# Add panel brand/power columns and power meter table

1. Modified Tables
   - `panels`: add `brand` (text, nullable) — marca del pannello (es. JA SOLAR, TRINA SOLAR)
   - `panels`: add `power_wp` (integer, nullable) — potenza del pannello in Watt-peak (es. 470, 475, ..., 700)

2. New Tables
   - `plant_power_meters`: power meter associati all'impianto
     - `id` (uuid, primary key)
     - `plant_id` (uuid, FK → plants.id, CASCADE)
     - `brand` (text, not null) — marca del power meter (es. DAZE)
     - `model` (text, not null) — modello (es. PM02M, PM02T)
     - `sort_order` (integer, default 0)
     - `created_at`, `updated_at` (timestamps)

3. Security
   - RLS enabled on `plant_power_meters`
   - Policies: same pattern as other plant equipment tables (authenticated, ownership via app_members)
*/

-- Add brand and power_wp to panels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'panels' AND column_name = 'brand') THEN
    ALTER TABLE panels ADD COLUMN brand text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'panels' AND column_name = 'power_wp') THEN
    ALTER TABLE panels ADD COLUMN power_wp integer DEFAULT NULL;
  END IF;
END $$;

-- Create plant_power_meters table
CREATE TABLE IF NOT EXISTS plant_power_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_power_meters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_power_meters" ON plant_power_meters;
CREATE POLICY "select_own_power_meters" ON plant_power_meters
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_power_meters" ON plant_power_meters;
CREATE POLICY "insert_own_power_meters" ON plant_power_meters
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_power_meters" ON plant_power_meters;
CREATE POLICY "update_own_power_meters" ON plant_power_meters
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_power_meters" ON plant_power_meters;
CREATE POLICY "delete_own_power_meters" ON plant_power_meters
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));
