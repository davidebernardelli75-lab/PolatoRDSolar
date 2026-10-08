BEGIN;

CREATE TABLE IF NOT EXISTS public.work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
  report_date date NOT NULL DEFAULT current_date,
  team_name text NOT NULL CHECK (char_length(btrim(team_name)) BETWEEN 1 AND 160),
  work_description text,
  notes text,
  status text NOT NULL DEFAULT 'BOZZA'
    CHECK (status IN ('BOZZA','DA_VERIFICARE','APPROVATO','DA_CORREGGERE')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_report_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  worker_name text NOT NULL CHECK (char_length(btrim(worker_name)) BETWEEN 1 AND 160),
  hours numeric(6,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_report_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  item_code text,
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 240),
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'PZ' CHECK (char_length(btrim(unit)) BETWEEN 1 AND 20),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_reports_plant_idx ON public.work_reports(plant_id);
CREATE INDEX IF NOT EXISTS work_reports_date_idx ON public.work_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS work_reports_status_idx ON public.work_reports(status);
CREATE INDEX IF NOT EXISTS work_reports_created_by_idx ON public.work_reports(created_by);
CREATE INDEX IF NOT EXISTS work_report_workers_report_idx ON public.work_report_workers(report_id);
CREATE INDEX IF NOT EXISTS work_report_materials_report_idx ON public.work_report_materials(report_id);

ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_materials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_reports, public.work_report_workers, public.work_report_materials
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_reports, public.work_report_workers, public.work_report_materials
  TO authenticated;

-- Admin: full access.
DROP POLICY IF EXISTS work_reports_admin_all ON public.work_reports;
CREATE POLICY work_reports_admin_all ON public.work_reports FOR ALL TO authenticated
  USING ((SELECT polato_internal.is_polato_admin()))
  WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_report_workers_admin_all ON public.work_report_workers;
CREATE POLICY work_report_workers_admin_all ON public.work_report_workers FOR ALL TO authenticated
  USING ((SELECT polato_internal.is_polato_admin()))
  WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_report_materials_admin_all ON public.work_report_materials;
CREATE POLICY work_report_materials_admin_all ON public.work_report_materials FOR ALL TO authenticated
  USING ((SELECT polato_internal.is_polato_admin()))
  WITH CHECK ((SELECT polato_internal.is_polato_admin()));

-- Operators: only their own reports; rows can be edited while draft or returned for correction.
DROP POLICY IF EXISTS work_reports_operator_select ON public.work_reports;
CREATE POLICY work_reports_operator_select ON public.work_reports FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS work_reports_operator_insert ON public.work_reports;
CREATE POLICY work_reports_operator_insert ON public.work_reports FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND status = 'BOZZA'
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS work_reports_operator_update ON public.work_reports;
CREATE POLICY work_reports_operator_update ON public.work_reports FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND status IN ('BOZZA','DA_CORREGGERE')
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND status IN ('BOZZA','DA_VERIFICARE','DA_CORREGGERE')
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS work_reports_operator_delete ON public.work_reports;
CREATE POLICY work_reports_operator_delete ON public.work_reports FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND status IN ('BOZZA','DA_CORREGGERE')
    AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS work_report_workers_operator_select ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_select ON public.work_report_workers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id AND r.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS work_report_workers_operator_insert ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_insert ON public.work_report_workers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  );

DROP POLICY IF EXISTS work_report_workers_operator_update ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_update ON public.work_report_workers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  );

DROP POLICY IF EXISTS work_report_workers_operator_delete ON public.work_report_workers;
CREATE POLICY work_report_workers_operator_delete ON public.work_report_workers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_select ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_select ON public.work_report_materials FOR SELECT TO authenticated
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
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_update ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_update ON public.work_report_materials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  );

DROP POLICY IF EXISTS work_report_materials_operator_delete ON public.work_report_materials;
CREATE POLICY work_report_materials_operator_delete ON public.work_report_materials FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports r
      WHERE r.id = report_id
        AND r.created_by = (SELECT auth.uid())
        AND r.status IN ('BOZZA','DA_CORREGGERE')
    )
  );

NOTIFY pgrst, 'reload schema';
COMMIT;
