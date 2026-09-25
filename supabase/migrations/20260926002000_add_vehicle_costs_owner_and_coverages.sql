-- APPLY ONLY TO THE SUPABASE PROJECT ACTUALLY USED BY POLATO SOLAR ARCHIVE.
-- Confirm the project's ID before execution; do not run on personal or pricing projects.
-- Additive migration: does not delete or rewrite any existing vehicle data.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'Azienda',
  ADD COLUMN IF NOT EXISTS insurance_categories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tax_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS inspection_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_cost numeric(10,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.vehicles'::regclass AND conname = 'vehicles_owner_type_check') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_owner_type_check
      CHECK (owner_type IN ('Privato', 'Azienda'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.vehicles'::regclass AND conname = 'vehicles_tax_cost_check') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_tax_cost_check CHECK (tax_cost >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.vehicles'::regclass AND conname = 'vehicles_inspection_cost_check') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_inspection_cost_check CHECK (inspection_cost >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.vehicles'::regclass AND conname = 'vehicles_service_cost_check') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_service_cost_check CHECK (service_cost >= 0);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
