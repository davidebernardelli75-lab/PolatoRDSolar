-- Revoke public/anonymous and authenticated EXECUTE on the trigger function
-- so it can only be invoked by the database trigger, not via the REST API.
REVOKE EXECUTE ON FUNCTION public.auto_populate_roadmap() FROM anon, authenticated;
