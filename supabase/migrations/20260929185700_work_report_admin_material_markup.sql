BEGIN;

CREATE TABLE IF NOT EXISTS public.work_report_admin_summaries (
  report_id uuid PRIMARY KEY REFERENCES public.work_reports(id) ON DELETE CASCADE,
  material_markup_percent numeric(7,2) NOT NULL DEFAULT 0 CHECK (material_markup_percent >= -100 AND material_markup_percent <= 1000),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_report_admin_summaries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_report_admin_summaries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_report_admin_summaries TO authenticated;

DROP POLICY IF EXISTS work_report_admin_summaries_admin_all ON public.work_report_admin_summaries;
CREATE POLICY work_report_admin_summaries_admin_all
ON public.work_report_admin_summaries
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

CREATE OR REPLACE FUNCTION public.set_work_report_material_markup(
  p_report_id uuid,
  p_markup_percent numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_markup_percent IS NULL OR p_markup_percent < -100 OR p_markup_percent > 1000 THEN
    RAISE EXCEPTION 'Invalid markup percent';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.work_reports wr WHERE wr.id = p_report_id) THEN
    RAISE EXCEPTION 'Work report not found';
  END IF;

  INSERT INTO public.work_report_admin_summaries(report_id, material_markup_percent, updated_by, updated_at)
  VALUES (p_report_id, p_markup_percent, auth.uid(), now())
  ON CONFLICT (report_id) DO UPDATE SET
    material_markup_percent = EXCLUDED.material_markup_percent,
    updated_by = auth.uid(),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_work_report_material_markup(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_work_report_material_markup(uuid, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
