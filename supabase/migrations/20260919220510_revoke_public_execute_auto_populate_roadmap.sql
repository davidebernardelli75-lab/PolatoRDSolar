-- Revoke EXECUTE from PUBLIC (default grant) so only the internal trigger can call it.
REVOKE EXECUTE ON FUNCTION public.auto_populate_roadmap() FROM PUBLIC;
