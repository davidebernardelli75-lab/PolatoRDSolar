-- Immediately reject revoked administrator sessions at the RLS boundary.
-- Supabase access tokens can remain cryptographically valid until their exp
-- even after global sign-out. Admin authorization therefore also requires the
-- JWT session_id to still exist in auth.sessions.
BEGIN;

CREATE OR REPLACE FUNCTION polato_internal.is_polato_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_user_roles AS r
    JOIN auth.sessions AS s
      ON s.user_id = r.user_id
    WHERE r.user_id = (SELECT auth.uid())
      AND r.role = 'admin'
      AND s.id = NULLIF((SELECT auth.jwt() ->> 'session_id'), '')::uuid
  );
$$;

REVOKE ALL ON FUNCTION polato_internal.is_polato_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION polato_internal.is_polato_admin() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
