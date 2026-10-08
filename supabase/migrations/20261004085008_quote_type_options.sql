BEGIN;

CREATE TABLE IF NOT EXISTS public.quote_type_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL CHECK (btrim(label) <> ''),
  normalized_label text GENERATED ALWAYS AS (
    upper(regexp_replace(btrim(label), '[[:space:]]+', ' ', 'g'))
  ) STORED,
  sort_order integer NOT NULL DEFAULT 500,
  is_custom boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (normalized_label)
);

ALTER TABLE public.quote_type_options ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quote_type_options FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_type_options TO authenticated;

DROP POLICY IF EXISTS quote_type_options_admin_all ON public.quote_type_options;
CREATE POLICY quote_type_options_admin_all
ON public.quote_type_options
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

INSERT INTO public.quote_type_options(label, sort_order, is_custom, active)
VALUES
  ('FOTOVOLTAICO', 10, false, true),
  ('FOTOVOLTAICO + ACCUMULO', 20, false, true),
  ('ACCUMULO', 30, false, true),
  ('COLONNINA / WALLBOX', 40, false, true),
  ('AMPLIAMENTO / MODIFICA IMPIANTO', 50, false, true),
  ('MANUTENZIONE / RIPARAZIONE', 60, false, true),
  ('PULIZIA / MANUTENZIONE PANNELLI', 70, false, true)
ON CONFLICT (normalized_label) DO UPDATE
SET active = true,
    updated_at = now();

-- Preserve every type already used in historical requests so existing records
-- remain immediately selectable without changing their stored value.
INSERT INTO public.quote_type_options(label, sort_order, is_custom, active)
SELECT DISTINCT upper(regexp_replace(btrim(quote_type), '[[:space:]]+', ' ', 'g')), 500, true, true
FROM public.quote_requests
WHERE quote_type IS NOT NULL
  AND btrim(quote_type) <> ''
ON CONFLICT (normalized_label) DO NOTHING;

CREATE OR REPLACE FUNCTION public.remember_quote_type_option(p_label text)
RETURNS public.quote_type_options
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_label text := upper(regexp_replace(btrim(p_label), '[[:space:]]+', ' ', 'g'));
  v_row public.quote_type_options;
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF v_label = '' THEN
    RAISE EXCEPTION 'Label required';
  END IF;

  INSERT INTO public.quote_type_options(label, sort_order, is_custom, active)
  VALUES (v_label, 500, true, true)
  ON CONFLICT (normalized_label)
  DO UPDATE SET
    active = true,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.remember_quote_type_option(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remember_quote_type_option(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
