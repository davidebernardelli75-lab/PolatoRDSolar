BEGIN;

-- Operators may correct or delete their own rapportini even after approval.
DROP POLICY IF EXISTS work_reports_operator_update ON public.work_reports;
CREATE POLICY work_reports_operator_update ON public.work_reports FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND status IN ('BOZZA','DA_VERIFICARE','APPROVATO','DA_CORREGGERE')
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS work_reports_operator_delete ON public.work_reports;
CREATE POLICY work_reports_operator_delete ON public.work_reports FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS work_report_workers_operator_insert ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_insert ON public.work_report_workers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_workers_operator_update ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_update ON public.work_report_workers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_workers_operator_delete ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_delete ON public.work_report_workers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_insert ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_insert ON public.work_report_materials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_update ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_update ON public.work_report_materials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_delete ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_delete ON public.work_report_materials FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
    )
  );

-- Admin-only transactional deletion of an entire plant/job and its work reports.
CREATE OR REPLACE FUNCTION public.delete_work_report_job(p_plant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.plants p WHERE p.id = p_plant_id) THEN
    RAISE EXCEPTION 'Plant not found';
  END IF;

  DELETE FROM public.work_reports WHERE plant_id = p_plant_id;
  DELETE FROM public.plants WHERE id = p_plant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_work_report_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_work_report_job(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
