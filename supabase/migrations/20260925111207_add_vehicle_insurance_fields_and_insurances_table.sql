/*
# Add vehicle tax/insurance fields and insurances table

1. Modified Tables
   - `vehicles`: add `tax_expiry` (date, nullable) — scadenza bollo
   - `vehicles`: add `insurance_company` (text, nullable) — compagnia assicurativa
   - `vehicles`: add `vehicle_category` (text, nullable) — categoria (Auto, Furgone, Motoveicolo)

2. New Tables
   - `insurances`: polizze assicurative varie (non veicoli)
     - `id` (uuid, pk)
     - `category` (text, not null) — categoria (Animali, Casa, Salute, ecc.)
     - `provider` (text, not null) — compagnia assicurativa
     - `policy_number` (text, nullable) — numero polizza
     - `insured_item` (text, nullable) — bene assicurato (descrizione)
     - `premium_amount` (numeric, nullable) — premio annuo
     - `start_date` (date, nullable) — inizio copertura
     - `expiry_date` (date, nullable) — scadenza copertura
     - `notes` (text, nullable)
     - `created_at`, `updated_at` (timestamps)

3. Security
   - RLS enabled on `insurances`
   - Policies: same pattern as other tables (authenticated, ownership via app_members)
*/

-- Add fields to vehicles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tax_expiry') THEN
    ALTER TABLE vehicles ADD COLUMN tax_expiry date DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'insurance_company') THEN
    ALTER TABLE vehicles ADD COLUMN insurance_company text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vehicle_category') THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_category text DEFAULT NULL;
  END IF;
END $$;

-- Create insurances table
CREATE TABLE IF NOT EXISTS insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT '',
  policy_number text,
  insured_item text,
  premium_amount numeric(10,2),
  start_date date,
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_insurances" ON insurances;
CREATE POLICY "select_own_insurances" ON insurances
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_insurances" ON insurances;
CREATE POLICY "insert_own_insurances" ON insurances
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_insurances" ON insurances;
CREATE POLICY "update_own_insurances" ON insurances
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_insurances" ON insurances;
CREATE POLICY "delete_own_insurances" ON insurances
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()));
