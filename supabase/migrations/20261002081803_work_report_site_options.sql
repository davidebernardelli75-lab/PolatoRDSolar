BEGIN;

CREATE OR REPLACE FUNCTION public.list_work_report_sites()
RETURNS TABLE (
  quote_request_id uuid,
  progressive_number integer,
  series text,
  quote_year integer,
  client text,
  site_reference text,
  quote_status text,
  report_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    q.id AS quote_request_id,
    q.progressive_number,
    q.series,
    q.quote_year,
    q.client,
    COALESCE(
      (
        SELECT r.client_reference
        FROM public.work_reports r
        WHERE r.quote_request_id = q.id
        ORDER BY r.report_date DESC, r.created_at DESC
        LIMIT 1
      ),
      q.client
    ) AS site_reference,
    q.status AS quote_status,
    (
      SELECT count(*)::integer
      FROM public.work_reports r
      WHERE r.quote_request_id = q.id
    ) AS report_count
  FROM public.quote_requests q
  WHERE (
      (SELECT polato_internal.is_polato_admin())
      OR EXISTS (
        SELECT 1
        FROM public.app_members m
        WHERE m.user_id = (SELECT auth.uid())
      )
    )
    AND (
      q.status = 'ACCETTATO'
      OR EXISTS (
        SELECT 1
        FROM public.work_reports r
        WHERE r.quote_request_id = q.id
      )
    )
  ORDER BY q.quote_year DESC, q.progressive_number DESC, q.series ASC;
$$;

REVOKE ALL ON FUNCTION public.list_work_report_sites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_work_report_sites() TO authenticated;

COMMENT ON FUNCTION public.list_work_report_sites() IS
  'Elenca i cantieri selezionabili nei rapportini senza esporre valori economici dei preventivi agli operatori.';

NOTIFY pgrst, 'reload schema';

COMMIT;
