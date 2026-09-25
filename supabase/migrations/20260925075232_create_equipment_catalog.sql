/*
# Create equipment_catalog table for custom brands and models

1. New Tables
- `equipment_catalog`: stores custom brands and models added by users
  - id, category ('inverter' | 'storage'), brand, model (nullable), created_at

2. Security
- Enable RLS, authorized for all app_members (same pattern as other tables).

3. Notes
- When model is NULL, the row represents a brand only.
- When model has a value, it represents a specific model for that brand.
- The frontend merges preset brands/models with custom ones from this table.
*/

CREATE TABLE IF NOT EXISTS equipment_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('inverter', 'storage')),
  brand text NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authorized_all_equipment_catalog" ON equipment_catalog;
CREATE POLICY "authorized_all_equipment_catalog" ON equipment_catalog FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM app_members WHERE app_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM app_members WHERE app_members.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category_brand ON equipment_catalog(category, brand);
