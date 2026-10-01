BEGIN;

-- Operators can correct or delete their own rapportini even after approval.
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
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_workers_operator_update ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_update ON public.work_report_workers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_workers_operator_delete ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_delete ON public.work_report_workers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_insert ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_insert ON public.work_report_materials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_update ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_update ON public.work_report_materials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_delete ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_delete ON public.work_report_materials FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  );

-- Remove the earlier full-plant deletion helper: deleting a cantiere from Rapportini
-- must remove the grouped work reports, not the FV plant registry itself.
DROP FUNCTION IF EXISTS public.delete_work_report_job(uuid);

CREATE OR REPLACE FUNCTION public.delete_work_report_group(
  p_quote_request_id uuid,
  p_report_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_quote_request_id IS NOT NULL THEN
    DELETE FROM public.work_reports
    WHERE quote_request_id = p_quote_request_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
  END IF;

  IF p_report_ids IS NULL OR cardinality(p_report_ids) = 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM public.work_reports
  WHERE id = ANY(p_report_ids)
    AND quote_request_id IS NULL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_work_report_group(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_work_report_group(uuid, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
