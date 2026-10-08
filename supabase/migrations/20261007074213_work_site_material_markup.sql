BEGIN;

ALTER TABLE public.work_sites
  ADD COLUMN IF NOT EXISTS material_markup_percent numeric(7,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.work_sites'::regclass
      AND conname = 'work_sites_material_markup_percent_check'
  ) THEN
    ALTER TABLE public.work_sites
      ADD CONSTRAINT work_sites_material_markup_percent_check
      CHECK (material_markup_percent >= -100 AND material_markup_percent <= 1000);
  END IF;
END
$$;

WITH latest_markup AS (
  SELECT DISTINCT ON (wr.site_id)
    wr.site_id,
    s.material_markup_percent
  FROM public.work_reports wr
  JOIN public.work_report_admin_summaries s
    ON s.report_id = wr.id
  WHERE wr.site_id IS NOT NULL
  ORDER BY wr.site_id, s.updated_at DESC, wr.updated_at DESC
)
UPDATE public.work_sites ws
SET material_markup_percent = lm.material_markup_percent,
    updated_at = now()
FROM latest_markup lm
WHERE ws.id = lm.site_id
  AND ws.material_markup_percent = 0;

NOTIFY pgrst, 'reload schema';

COMMIT;
