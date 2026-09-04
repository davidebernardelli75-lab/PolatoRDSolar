/*
# Create Polato R&D Solar Archive schema

1. New tables
- `plants`: shared plant records, owner contact details, and installation specifications.
- `panels`: panel serial numbers linked to a plant.
- `panel_photos`: uploaded photo metadata linked to a plant and optionally a panel.

2. Storage
- Creates a private `solar-archive` bucket for field photos.
- Objects are stored under a plant folder and exposed only through the app's scoped policies.

3. Security
- Enables row level security on all application tables.
- Adds separate SELECT, INSERT, UPDATE, and DELETE policies for the no-sign-in single-tenant app.
- Adds separate storage object policies for the archive bucket.

4. Important notes
- This first version is intentionally single-tenant because the app has no sign-in screen.
- Plant, panel, and photo data is shared through the configured app workspace.
- The database validates required relationships and numeric power values.
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

DROP POLICY IF EXISTS "shared_select_plants" ON public.plants;
CREATE POLICY "shared_select_plants" ON public.plants FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_plants" ON public.plants;
CREATE POLICY "shared_insert_plants" ON public.plants FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_plants" ON public.plants;
CREATE POLICY "shared_update_plants" ON public.plants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_plants" ON public.plants;
CREATE POLICY "shared_delete_plants" ON public.plants FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_panels" ON public.panels;
CREATE POLICY "shared_select_panels" ON public.panels FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_panels" ON public.panels;
CREATE POLICY "shared_insert_panels" ON public.panels FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_panels" ON public.panels;
CREATE POLICY "shared_update_panels" ON public.panels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_panels" ON public.panels;
CREATE POLICY "shared_delete_panels" ON public.panels FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_select_panel_photos" ON public.panel_photos;
CREATE POLICY "shared_select_panel_photos" ON public.panel_photos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shared_insert_panel_photos" ON public.panel_photos;
CREATE POLICY "shared_insert_panel_photos" ON public.panel_photos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shared_update_panel_photos" ON public.panel_photos;
CREATE POLICY "shared_update_panel_photos" ON public.panel_photos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shared_delete_panel_photos" ON public.panel_photos;
CREATE POLICY "shared_delete_panel_photos" ON public.panel_photos FOR DELETE TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('solar-archive', 'solar-archive', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

DROP POLICY IF EXISTS "shared_read_solar_archive" ON storage.objects;
CREATE POLICY "shared_read_solar_archive" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'solar-archive');
DROP POLICY IF EXISTS "shared_upload_solar_archive" ON storage.objects;
CREATE POLICY "shared_upload_solar_archive" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'solar-archive' AND (storage.foldername(name))[1] IS NOT NULL);
DROP POLICY IF EXISTS "shared_update_solar_archive" ON storage.objects;
CREATE POLICY "shared_update_solar_archive" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'solar-archive') WITH CHECK (bucket_id = 'solar-archive');
DROP POLICY IF EXISTS "shared_delete_solar_archive" ON storage.objects;
CREATE POLICY "shared_delete_solar_archive" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'solar-archive');