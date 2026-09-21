/*
# Create plant_inverters and plant_storages tables

## Purpose
Allows multiple inverters and multiple storage systems per plant.
Previously inverter and storage info was stored as single fields on the plants
table. Now each plant can have N inverters and N storage units, each with
brand, model, and code.

## New Tables

### plant_inverters
- id (uuid PK)
- plant_id (uuid FK -> plants, ON DELETE CASCADE)
- brand (text)
- model (text)
- code (text)
- sort_order (int, default 0)
- created_at, updated_at (timestamptz)

### plant_storages
- id (uuid PK)
- plant_id (uuid FK -> plants, ON DELETE CASCADE)
- brand (text)
- model (text)
- code (text)
- power_kw (numeric, nullable)
- sort_order (int, default 0)
- created_at, updated_at (timestamptz)

## Security
- RLS enabled on both tables.
- Same pattern as roadmap_tasks: authenticated app_members get full CRUD,
  anon revoked. FOR ALL policy with app_members membership check.

## Data migration
- Existing single-field inverter data (inverter_brand, inverter_model,
  inverter_code) is copied into one row per plant in plant_inverters.
- Existing single-field storage data (storage_brand, storage_model,
  storage_code, storage_power_kw) is copied into one row per plant in
  plant_storages.
- Only rows where at least one field is non-null are migrated.
*/

CREATE TABLE IF NOT EXISTS public.plant_inverters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plant_inverters_plant_id_idx ON public.plant_inverters(plant_id);

ALTER TABLE public.plant_inverters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.plant_inverters FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plant_inverters TO authenticated;

DROP POLICY IF EXISTS "authorized_all_plant_inverters" ON public.plant_inverters;
CREATE POLICY "authorized_all_plant_inverters" ON public.plant_inverters FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));

CREATE TABLE IF NOT EXISTS public.plant_storages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  power_kw numeric,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plant_storages_plant_id_idx ON public.plant_storages(plant_id);

ALTER TABLE public.plant_storages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.plant_storages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plant_storages TO authenticated;

DROP POLICY IF EXISTS "authorized_all_plant_storages" ON public.plant_storages;
CREATE POLICY "authorized_all_plant_storages" ON public.plant_storages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));

-- Migrate existing single-field inverter data
INSERT INTO public.plant_inverters (plant_id, brand, model, code, sort_order)
SELECT p.id,
  COALESCE(p.inverter_brand, ''),
  COALESCE(p.inverter_model, ''),
  COALESCE(p.inverter_code, ''),
  0
FROM public.plants p
WHERE p.inverter_brand IS NOT NULL
   OR p.inverter_model IS NOT NULL
   OR p.inverter_code IS NOT NULL
   OR p.inverter_brand_model IS NOT NULL;

-- For plants that only had the old inverter_brand_model field, put it in brand
UPDATE public.plant_inverters
SET brand = p.inverter_brand_model
FROM public.plants p
WHERE plant_inverters.plant_id = p.id
  AND plant_inverters.brand = ''
  AND p.inverter_brand_model IS NOT NULL;

-- Migrate existing single-field storage data
INSERT INTO public.plant_storages (plant_id, brand, model, code, power_kw, sort_order)
SELECT p.id,
  COALESCE(p.storage_brand, ''),
  COALESCE(p.storage_model, ''),
  COALESCE(p.storage_code, ''),
  p.storage_power_kw,
  0
FROM public.plants p
WHERE p.storage_brand IS NOT NULL
   OR p.storage_model IS NOT NULL
   OR p.storage_code IS NOT NULL
   OR p.storage_power_kw IS NOT NULL;
