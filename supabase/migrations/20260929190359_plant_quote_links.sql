BEGIN;

CREATE TABLE IF NOT EXISTS public.plant_quote_links (
  plant_id uuid PRIMARY KEY REFERENCES public.plants(id) ON DELETE CASCADE,
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_quote_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.plant_quote_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_quote_links TO authenticated;

DROP POLICY IF EXISTS plant_quote_links_admin_all ON public.plant_quote_links;
CREATE POLICY plant_quote_links_admin_all
ON public.plant_quote_links
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

CREATE INDEX IF NOT EXISTS plant_quote_links_quote_idx
  ON public.plant_quote_links(quote_request_id);

NOTIFY pgrst, 'reload schema';
COMMIT;
