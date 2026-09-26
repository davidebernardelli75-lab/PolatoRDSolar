-- STEP 3 / 3: enforce administration-only access to vehicles and insurances.
-- Run ONLY after app_user_roles has an explicit admin row for an existing user.
-- Run after creating the training tables in 20260926110000.
-- DOES NOT TOUCH plants, panels, photos, storage or roadmap (FV remains open
-- to ALL authenticated app users under the existing plant-specific RLS rules).
-- Changes existing policies on vehicles and insurances intentionally; inspect
-- those policies before applying in organizations with custom security roles.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.app_user_roles') IS NULL THEN
    RAISE EXCEPTION 'First apply 20260926100000_app_admin_roles.sql';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.app_user_roles AS r
    JOIN auth.users AS u ON u.id = r.user_id
    WHERE r.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'BLOCKED: assign at least one existing admin account before restricting production';
  END IF;
  IF to_regclass('public.vehicles') IS NULL OR to_regclass('public.insurances') IS NULL THEN
    RAISE EXCEPTION 'Missing existing vehicle/insurance tables: stop';
  END IF;
  IF to_regclass('public.employees') IS NULL
    OR to_regclass('public.employee_courses') IS NULL
    OR to_regclass('public.training_custom_courses') IS NULL THEN
    RAISE EXCEPTION 'First apply 20260926110000_personnel_training.sql';
  END IF;
END $$;

-- Replace all pre-existing broad permissive policies for these TWO tables.
-- Keeping any permissive authenticated policy would bypass admin checks.
DO $$
DECLARE current_policy record;
BEGIN
  FOR current_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('vehicles', 'insurances')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',
      current_policy.policyname, current_policy.schemaname, current_policy.tablename);
  END LOOP;
END $$;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurances ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.vehicles, public.insurances FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles, public.insurances TO authenticated;

CREATE POLICY vehicles_admin_only
  ON public.vehicles FOR ALL TO authenticated
  USING ((SELECT polato_internal.is_polato_admin()))
  WITH CHECK ((SELECT polato_internal.is_polato_admin()));

CREATE POLICY insurances_admin_only
  ON public.insurances FOR ALL TO authenticated
  USING ((SELECT polato_internal.is_polato_admin()))
  WITH CHECK ((SELECT polato_internal.is_polato_admin()));

NOTIFY pgrst, 'reload schema';
COMMIT;
