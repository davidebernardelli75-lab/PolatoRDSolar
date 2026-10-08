BEGIN;

ALTER FUNCTION public.remember_quote_type_option(text) SECURITY INVOKER;

COMMIT;
