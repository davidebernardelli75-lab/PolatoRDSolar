-- STEP 1 / 3: create a server-validated admin role without changing existing access.
-- Execute ONLY against Polato Solar's original project fjmrfxjvqsdrwjucgzla.
-- All users without an explicit admin row are field operators (FV only AFTER step 3).
-- DO NOT grant role table INSERT/UPDATE/DELETE to app users.
BEGIN;
CREATE TABLE IF NOT EXISTS public.app_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'operator')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.app_user_roles TO authenticated;

DROP POLICY IF EXISTS app_user_roles_self_read ON public.app_user_roles;
CREATE POLICY app_user_roles_self_read
  ON public.app_user_roles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Keep SECURITY DEFINER helper in a schema not exposed by PostgREST.
CREATE SCHEMA IF NOT EXISTS polato_internal;
REVOKE ALL ON SCHEMA polato_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA polato_internal TO authenticated;

CREATE OR REPLACE FUNCTION polato_internal.is_polato_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_user_roles AS r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION polato_internal.is_polato_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION polato_internal.is_polato_admin() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
