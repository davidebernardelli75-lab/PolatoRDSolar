-- Keep existing vehicle records and policies. Existing date values are interpreted
-- by month in the UI; new month/year selections are stored as the first day.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'Azienda',
  ADD COLUMN IF NOT EXISTS insurance_categories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS tax_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS inspection_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_cost numeric(10,2);

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_owner_type_check CHECK (owner_type IN ('Privato', 'Azienda')),
  ADD CONSTRAINT vehicles_tax_cost_check CHECK (tax_cost >= 0),
  ADD CONSTRAINT vehicles_inspection_cost_check CHECK (inspection_cost >= 0),
  ADD CONSTRAINT vehicles_service_cost_check CHECK (service_cost >= 0);
