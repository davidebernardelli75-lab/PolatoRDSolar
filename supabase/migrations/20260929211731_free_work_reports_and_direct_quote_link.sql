BEGIN;

ALTER TABLE public.work_reports
  ALTER COLUMN plant_id DROP NOT NULL;

ALTER TABLE public.work_reports
  ADD COLUMN IF NOT EXISTS client_reference text,
  ADD COLUMN IF NOT EXISTS quote_request_id uuid REFERENCES public.quote_requests(id) ON DELETE RESTRICT;

UPDATE public.work_reports r
SET client_reference = concat_ws(' - ', NULLIF(btrim(p.owner_name), ''), NULLIF(btrim(p.address), ''))
FROM public.plants p
WHERE r.plant_id = p.id
  AND (r.client_reference IS NULL OR btrim(r.client_reference) = '');

UPDATE public.work_reports
SET client_reference = 'RIFERIMENTO DA VERIFICARE'
WHERE client_reference IS NULL OR btrim(client_reference) = '';

UPDATE public.work_reports r
SET quote_request_id = l.quote_request_id
FROM public.plant_quote_links l
WHERE r.plant_id = l.plant_id
  AND r.quote_request_id IS NULL;

ALTER TABLE public.work_reports
  ALTER COLUMN client_reference SET NOT NULL;

ALTER TABLE public.work_reports
  DROP CONSTRAINT IF EXISTS work_reports_client_reference_check;

ALTER TABLE public.work_reports
  ADD CONSTRAINT work_reports_client_reference_check
  CHECK (char_length(btrim(client_reference)) BETWEEN 1 AND 240);

CREATE INDEX IF NOT EXISTS work_reports_quote_request_idx
  ON public.work_reports(quote_request_id);

NOTIFY pgrst, 'reload schema';

COMMIT;
