/*
# Create plant_chargers and vehicles tables

1. New Tables
- `plant_chargers`: charging stations associated with a plant (like plant_inverters/plant_storages)
  - id, plant_id (FK plants), brand, model, code, sort_order, created_at, updated_at
- `vehicles`: company vehicle fleet for tracking maintenance deadlines.
  - id, type ('Auto'|'Furgone'), plate, brand, model, mileage_km, service_interval_km,
    last_service_km, last_service_date, insurance_expiry, inspection_expiry, notes, created_at, updated_at

2. Security
- Enable RLS on both tables.
- plant_chargers: authorized for all app_members (same pattern as plant_inverters).
- vehicles: authorized for all app_members (same pattern).

3. Notes
- plant_chargers mirrors the structure of plant_inverters and plant_storages.
- vehicles stores per-vehicle maintenance tracking data. The app computes
  alert status from insurance_expiry, inspection_expiry, and service km thresholds.
*/

-- ── plant_chargers ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plant_chargers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_chargers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authorized_all_plant_chargers" ON plant_chargers;
CREATE POLICY "authorized_all_plant_chargers" ON plant_chargers FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_members WHERE app_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM app_members WHERE app_members.user_id = auth.uid())
  );

-- ── vehicles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'Auto' CHECK (type IN ('Auto', 'Furgone')),
  plate text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  mileage_km int NOT NULL DEFAULT 0,
  service_interval_km int NOT NULL DEFAULT 20000,
  last_service_km int NOT NULL DEFAULT 0,
  last_service_date date,
  insurance_expiry date,
  inspection_expiry date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authorized_all_vehicles" ON vehicles;
CREATE POLICY "authorized_all_vehicles" ON vehicles FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_members WHERE app_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM app_members WHERE app_members.user_id = auth.uid())
  );
