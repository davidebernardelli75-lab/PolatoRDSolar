BEGIN;

ALTER TABLE public.work_site_options
  DROP CONSTRAINT IF EXISTS work_site_options_field_key_check;

ALTER TABLE public.work_site_options
  ADD CONSTRAINT work_site_options_field_key_check
  CHECK (field_key IN (
    'CATEGORY',
    'SITE_STATUS',
    'PHASE_PROGRESS_STATUS',
    'PHASE_BILLING_STATUS',
    'WORK_SCOPE'
  ));

INSERT INTO public.work_site_options(field_key, label, sort_order, is_custom, active)
VALUES
  ('WORK_SCOPE','IMPIANTO ELETTRICO',10,false,true),
  ('WORK_SCOPE','FOTOVOLTAICO',20,false,true),
  ('WORK_SCOPE','ACCUMULO',30,false,true),
  ('WORK_SCOPE','COLONNINA EV',40,false,true),
  ('WORK_SCOPE','DOMOTICA / AUTOMAZIONE',50,false,true),
  ('WORK_SCOPE','RETE DATI',60,false,true),
  ('WORK_SCOPE','ALLARME / SICUREZZA',70,false,true),
  ('WORK_SCOPE','MANUTENZIONE',80,false,true)
ON CONFLICT (field_key, normalized_label) DO UPDATE
SET active = true,
    updated_at = now();

CREATE TABLE IF NOT EXISTS public.work_site_scopes (
  site_id uuid NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.work_site_options(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, option_id)
);

CREATE INDEX IF NOT EXISTS work_site_scopes_option_idx
  ON public.work_site_scopes(option_id);

CREATE TABLE IF NOT EXISTS public.work_site_plants (
  site_id uuid NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, plant_id)
);

CREATE INDEX IF NOT EXISTS work_site_plants_plant_idx
  ON public.work_site_plants(plant_id);

ALTER TABLE public.work_site_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_site_plants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_site_scopes, public.work_site_plants
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_site_scopes, public.work_site_plants
  TO authenticated;

DROP POLICY IF EXISTS work_site_scopes_admin_all ON public.work_site_scopes;
CREATE POLICY work_site_scopes_admin_all
ON public.work_site_scopes
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_site_plants_admin_all ON public.work_site_plants;
CREATE POLICY work_site_plants_admin_all
ON public.work_site_plants
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

-- Existing sites that used FOTOVOLTAICO as their category become normal sites
-- with FOTOVOLTAICO as one of their operational scopes.
INSERT INTO public.work_site_scopes(site_id, option_id)
SELECT s.id, o.id
FROM public.work_sites s
JOIN public.work_site_options o
  ON o.field_key = 'WORK_SCOPE'
 AND o.normalized_label = 'FOTOVOLTAICO'
WHERE upper(btrim(s.category)) = 'FOTOVOLTAICO'
ON CONFLICT DO NOTHING;

UPDATE public.work_sites
SET category = 'DA DEFINIRE',
    updated_at = now()
WHERE upper(btrim(category)) = 'FOTOVOLTAICO';

-- A quote in the FV series proves that the site has at least an FV scope,
-- while leaving the site's general category (CIVILE/INDUSTRIALE/etc.) untouched.
INSERT INTO public.work_site_scopes(site_id, option_id)
SELECT s.id, o.id
FROM public.work_sites s
JOIN public.quote_requests q ON q.id = s.quote_request_id
JOIN public.work_site_options o
  ON o.field_key = 'WORK_SCOPE'
 AND o.normalized_label = 'FOTOVOLTAICO'
WHERE upper(btrim(q.series)) = 'FV'
ON CONFLICT DO NOTHING;

-- Preserve any legacy single-plant link in the new many-to-many relation.
INSERT INTO public.work_site_plants(site_id, plant_id)
SELECT id, plant_id
FROM public.work_sites
WHERE plant_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Any site with a linked FV plant necessarily has an FV component.
INSERT INTO public.work_site_scopes(site_id, option_id)
SELECT DISTINCT sp.site_id, o.id
FROM public.work_site_plants sp
JOIN public.work_site_options o
  ON o.field_key = 'WORK_SCOPE'
 AND o.normalized_label = 'FOTOVOLTAICO'
ON CONFLICT DO NOTHING;

-- FOTOVOLTAICO is no longer a general site category.
UPDATE public.work_site_options
SET active = false,
    updated_at = now()
WHERE field_key = 'CATEGORY'
  AND normalized_label = 'FOTOVOLTAICO';

CREATE OR REPLACE FUNCTION public.remember_work_site_option(p_field_key text, p_label text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_field text := upper(btrim(p_field_key));
  v_label text := upper(regexp_replace(btrim(p_label), '[[:space:]]+', ' ', 'g'));
  v_id uuid;
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF v_field NOT IN (
    'CATEGORY',
    'SITE_STATUS',
    'PHASE_PROGRESS_STATUS',
    'PHASE_BILLING_STATUS',
    'WORK_SCOPE'
  ) THEN
    RAISE EXCEPTION 'Unsupported field';
  END IF;
  IF v_label = '' THEN
    RAISE EXCEPTION 'Label required';
  END IF;

  INSERT INTO public.work_site_options(field_key, label, sort_order, is_custom, active)
  VALUES (v_field, v_label, 500, true, true)
  ON CONFLICT (field_key, normalized_label)
  DO UPDATE SET active = true, updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remember_work_site_option(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remember_work_site_option(text, text) TO authenticated;

COMMENT ON COLUMN public.work_sites.plant_id IS
  'DEPRECATED: retained temporarily for backward compatibility. Use public.work_site_plants for 0..N FV plants per site.';

NOTIFY pgrst, 'reload schema';

COMMIT;
