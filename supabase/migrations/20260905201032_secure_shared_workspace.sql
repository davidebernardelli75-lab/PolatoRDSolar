CREATE TABLE IF NOT EXISTS public.app_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_members FROM anon, authenticated;
GRANT SELECT ON TABLE public.app_members TO authenticated;

DROP POLICY IF EXISTS "members_read_self" ON public.app_members;
CREATE POLICY "members_read_self" ON public.app_members FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "shared_select_plants" ON public.plants;
DROP POLICY IF EXISTS "shared_insert_plants" ON public.plants;
DROP POLICY IF EXISTS "shared_update_plants" ON public.plants;
DROP POLICY IF EXISTS "shared_delete_plants" ON public.plants;
DROP POLICY IF EXISTS "shared_select_panels" ON public.panels;
DROP POLICY IF EXISTS "shared_insert_panels" ON public.panels;
DROP POLICY IF EXISTS "shared_update_panels" ON public.panels;
DROP POLICY IF EXISTS "shared_delete_panels" ON public.panels;
DROP POLICY IF EXISTS "shared_select_panel_photos" ON public.panel_photos;
DROP POLICY IF EXISTS "shared_insert_panel_photos" ON public.panel_photos;
DROP POLICY IF EXISTS "shared_update_panel_photos" ON public.panel_photos;
DROP POLICY IF EXISTS "shared_delete_panel_photos" ON public.panel_photos;

REVOKE ALL ON TABLE public.plants, public.panels, public.panel_photos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plants, public.panels, public.panel_photos TO authenticated;

CREATE POLICY "authorized_all_plants" ON public.plants FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "authorized_all_panels" ON public.panels FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "authorized_all_panel_photos" ON public.panel_photos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "shared_read_solar_archive" ON storage.objects;
DROP POLICY IF EXISTS "shared_upload_solar_archive" ON storage.objects;
DROP POLICY IF EXISTS "shared_update_solar_archive" ON storage.objects;
DROP POLICY IF EXISTS "shared_delete_solar_archive" ON storage.objects;

CREATE POLICY "authorized_read_solar_archive" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'solar-archive' AND EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "authorized_upload_solar_archive" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'solar-archive' AND (storage.foldername(name))[1] IS NOT NULL AND EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "authorized_update_solar_archive" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'solar-archive' AND EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())))
WITH CHECK (bucket_id = 'solar-archive' AND EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "authorized_delete_solar_archive" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'solar-archive' AND EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));
