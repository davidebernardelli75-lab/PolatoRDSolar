BEGIN;

-- These functions are trigger internals only. They must not be callable through the API.
REVOKE ALL ON FUNCTION public.initialize_work_site_phases() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_work_report_quote_from_site() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_site_quote_to_reports() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS work_sites_created_by_idx
  ON public.work_sites(created_by);

COMMIT;
