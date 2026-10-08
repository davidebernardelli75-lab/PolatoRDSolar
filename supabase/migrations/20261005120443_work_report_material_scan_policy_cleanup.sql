BEGIN;

DROP POLICY IF EXISTS work_report_material_codes_admin_all
  ON public.work_report_material_codes;

REVOKE UPDATE, DELETE ON public.work_report_material_codes FROM authenticated;

CREATE INDEX IF NOT EXISTS work_report_material_codes_created_by_idx
  ON public.work_report_material_codes(created_by);

COMMIT;
