/*
# Create Polato R&D Solar Archive schema

Creates the application tables and private photo bucket in a deny-by-default
state. Access policies are intentionally added only by the following
secure_shared_workspace migration.
*/

CREATE TABLE IF NOT EXISTS public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL DEFAULT 'Privato' CHECK (owner_type IN ('Privato', 'Azienda')),
  owner_name text NOT NULL,
  fiscal_or_vat text,
  address text NOT NULL,
  phone text,
  email text,
  total_power_kw numeric(10, 2) CHECK (total_power_kw IS NULL OR total_power_kw >= 0),
  panel_brand_model text,
  inverter_brand_model text,
  installation_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  serial_number text NOT NULL,
  position_label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.panel_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  panel_id uuid REFERENCES public.panels(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS panels_plant_id_idx ON public.panels(plant_id);
CREATE INDEX IF NOT EXISTS panel_photos_plant_id_idx ON public.panel_photos(plant_id);
CREATE INDEX IF NOT EXISTS panel_photos_panel_id_idx ON public.panel_photos(panel_id);

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_photos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.plants, public.panels, public.panel_photos FROM anon;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('solar-archive', 'solar-archive', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
