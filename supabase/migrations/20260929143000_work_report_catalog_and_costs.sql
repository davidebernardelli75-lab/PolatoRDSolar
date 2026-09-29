BEGIN;

ALTER TABLE public.work_report_workers
  ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'ORDINARIA';

CREATE TABLE IF NOT EXISTS public.work_report_material_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 240),
  normalized_description text NOT NULL UNIQUE,
  default_unit text NOT NULL DEFAULT 'PZ' CHECK (char_length(btrim(default_unit)) BETWEEN 1 AND 20),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  last_used_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_report_worker_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name text NOT NULL CHECK (char_length(btrim(worker_name)) BETWEEN 1 AND 160),
  normalized_worker_name text NOT NULL UNIQUE,
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  last_used_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_report_material_cost_defaults (
  material_catalog_id uuid PRIMARY KEY REFERENCES public.work_report_material_catalog(id) ON DELETE CASCADE,
  unit_price numeric(12,4) NOT NULL CHECK (unit_price >= 0),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_report_labor_rate_defaults (
  worker_catalog_id uuid NOT NULL REFERENCES public.work_report_worker_catalog(id) ON DELETE CASCADE,
  rate_type text NOT NULL DEFAULT 'ORDINARIA',
  hourly_rate numeric(12,4) NOT NULL CHECK (hourly_rate >= 0),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_catalog_id, rate_type)
);

CREATE TABLE IF NOT EXISTS public.work_report_material_costs (
  report_material_id uuid PRIMARY KEY REFERENCES public.work_report_materials(id) ON DELETE CASCADE,
  unit_price numeric(12,4) NOT NULL CHECK (unit_price >= 0),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_report_worker_costs (
  report_worker_id uuid PRIMARY KEY REFERENCES public.work_report_workers(id) ON DELETE CASCADE,
  hourly_rate numeric(12,4) NOT NULL CHECK (hourly_rate >= 0),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_report_material_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_worker_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_material_cost_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_labor_rate_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_worker_costs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_report_material_catalog, public.work_report_worker_catalog,
  public.work_report_material_cost_defaults, public.work_report_labor_rate_defaults,
  public.work_report_material_costs, public.work_report_worker_costs
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.work_report_material_catalog, public.work_report_worker_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_report_material_cost_defaults,
  public.work_report_labor_rate_defaults, public.work_report_material_costs, public.work_report_worker_costs
  TO authenticated;

DROP POLICY IF EXISTS work_report_material_catalog_member_select ON public.work_report_material_catalog;
CREATE POLICY work_report_material_catalog_member_select ON public.work_report_material_catalog
FOR SELECT TO authenticated
USING (
  active
  AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS work_report_worker_catalog_member_select ON public.work_report_worker_catalog;
CREATE POLICY work_report_worker_catalog_member_select ON public.work_report_worker_catalog
FOR SELECT TO authenticated
USING (
  active
  AND EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS work_report_material_cost_defaults_admin_all ON public.work_report_material_cost_defaults;
CREATE POLICY work_report_material_cost_defaults_admin_all ON public.work_report_material_cost_defaults
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_report_labor_rate_defaults_admin_all ON public.work_report_labor_rate_defaults;
CREATE POLICY work_report_labor_rate_defaults_admin_all ON public.work_report_labor_rate_defaults
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_report_material_costs_admin_all ON public.work_report_material_costs;
CREATE POLICY work_report_material_costs_admin_all ON public.work_report_material_costs
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_report_worker_costs_admin_all ON public.work_report_worker_costs;
CREATE POLICY work_report_worker_costs_admin_all ON public.work_report_worker_costs
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

CREATE OR REPLACE FUNCTION public.remember_work_report_material(p_description text, p_unit text DEFAULT 'PZ')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_description text := regexp_replace(upper(btrim(coalesce(p_description, ''))), '\\s+', ' ', 'g');
  v_unit text := regexp_replace(upper(btrim(coalesce(p_unit, 'PZ'))), '\\s+', ' ', 'g');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_description = '' THEN RETURN; END IF;

  INSERT INTO public.work_report_material_catalog (
    description, normalized_description, default_unit, usage_count, last_used_at
  )
  VALUES (v_description, v_description, coalesce(nullif(v_unit, ''), 'PZ'), 1, now())
  ON CONFLICT (normalized_description) DO UPDATE SET
    description = EXCLUDED.description,
    default_unit = CASE
      WHEN public.work_report_material_catalog.default_unit IS NULL OR public.work_report_material_catalog.default_unit = ''
      THEN EXCLUDED.default_unit
      ELSE public.work_report_material_catalog.default_unit
    END,
    usage_count = public.work_report_material_catalog.usage_count + 1,
    last_used_at = now(),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.remember_work_report_worker(p_worker_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text := regexp_replace(upper(btrim(coalesce(p_worker_name, ''))), '\\s+', ' ', 'g');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_members m WHERE m.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_name = '' THEN RETURN; END IF;

  INSERT INTO public.work_report_worker_catalog (
    worker_name, normalized_worker_name, usage_count, last_used_at
  )
  VALUES (v_name, v_name, 1, now())
  ON CONFLICT (normalized_worker_name) DO UPDATE SET
    worker_name = EXCLUDED.worker_name,
    usage_count = public.work_report_worker_catalog.usage_count + 1,
    last_used_at = now(),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_work_report_material_cost(p_report_material_id uuid, p_unit_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_description text;
  v_unit text;
  v_catalog_id uuid;
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'Invalid unit price';
  END IF;

  SELECT regexp_replace(upper(btrim(description)), '\\s+', ' ', 'g'),
         regexp_replace(upper(btrim(unit)), '\\s+', ' ', 'g')
  INTO v_description, v_unit
  FROM public.work_report_materials
  WHERE id = p_report_material_id;

  IF v_description IS NULL THEN RAISE EXCEPTION 'Material row not found'; END IF;

  INSERT INTO public.work_report_material_catalog (
    description, normalized_description, default_unit, usage_count, last_used_at
  )
  VALUES (v_description, v_description, coalesce(nullif(v_unit, ''), 'PZ'), 0, now())
  ON CONFLICT (normalized_description) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO v_catalog_id;

  INSERT INTO public.work_report_material_cost_defaults(material_catalog_id, unit_price, updated_by, updated_at)
  VALUES (v_catalog_id, p_unit_price, auth.uid(), now())
  ON CONFLICT (material_catalog_id) DO UPDATE SET
    unit_price = EXCLUDED.unit_price,
    updated_by = auth.uid(),
    updated_at = now();

  INSERT INTO public.work_report_material_costs(report_material_id, unit_price, updated_by, updated_at)
  VALUES (p_report_material_id, p_unit_price, auth.uid(), now())
  ON CONFLICT (report_material_id) DO UPDATE SET
    unit_price = EXCLUDED.unit_price,
    updated_by = auth.uid(),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_work_report_worker_cost(p_report_worker_id uuid, p_hourly_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_rate_type text;
  v_catalog_id uuid;
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_hourly_rate IS NULL OR p_hourly_rate < 0 THEN
    RAISE EXCEPTION 'Invalid hourly rate';
  END IF;

  SELECT regexp_replace(upper(btrim(worker_name)), '\\s+', ' ', 'g'),
         regexp_replace(upper(btrim(coalesce(rate_type, 'ORDINARIA'))), '\\s+', ' ', 'g')
  INTO v_name, v_rate_type
  FROM public.work_report_workers
  WHERE id = p_report_worker_id;

  IF v_name IS NULL THEN RAISE EXCEPTION 'Worker row not found'; END IF;

  INSERT INTO public.work_report_worker_catalog (
    worker_name, normalized_worker_name, usage_count, last_used_at
  )
  VALUES (v_name, v_name, 0, now())
  ON CONFLICT (normalized_worker_name) DO UPDATE SET
    worker_name = EXCLUDED.worker_name,
    updated_at = now()
  RETURNING id INTO v_catalog_id;

  INSERT INTO public.work_report_labor_rate_defaults(worker_catalog_id, rate_type, hourly_rate, updated_by, updated_at)
  VALUES (v_catalog_id, coalesce(nullif(v_rate_type, ''), 'ORDINARIA'), p_hourly_rate, auth.uid(), now())
  ON CONFLICT (worker_catalog_id, rate_type) DO UPDATE SET
    hourly_rate = EXCLUDED.hourly_rate,
    updated_by = auth.uid(),
    updated_at = now();

  INSERT INTO public.work_report_worker_costs(report_worker_id, hourly_rate, updated_by, updated_at)
  VALUES (p_report_worker_id, p_hourly_rate, auth.uid(), now())
  ON CONFLICT (report_worker_id) DO UPDATE SET
    hourly_rate = EXCLUDED.hourly_rate,
    updated_by = auth.uid(),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.remember_work_report_material(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remember_work_report_material(text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.remember_work_report_worker(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remember_work_report_worker(text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_work_report_material_cost(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_work_report_material_cost(uuid, numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.set_work_report_worker_cost(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_work_report_worker_cost(uuid, numeric) TO authenticated;

INSERT INTO public.work_report_material_catalog (
  description, normalized_description, default_unit, usage_count, last_used_at
)
SELECT
  regexp_replace(upper(btrim(m.description)), '\\s+', ' ', 'g'),
  regexp_replace(upper(btrim(m.description)), '\\s+', ' ', 'g'),
  coalesce(nullif(regexp_replace(upper(btrim(m.unit)), '\\s+', ' ', 'g'), ''), 'PZ'),
  count(*)::integer,
  max(m.created_at)
FROM public.work_report_materials m
WHERE btrim(m.description) <> ''
GROUP BY 1, 2, 3
ON CONFLICT (normalized_description) DO NOTHING;

INSERT INTO public.work_report_worker_catalog (
  worker_name, normalized_worker_name, usage_count, last_used_at
)
SELECT
  regexp_replace(upper(btrim(w.worker_name)), '\\s+', ' ', 'g'),
  regexp_replace(upper(btrim(w.worker_name)), '\\s+', ' ', 'g'),
  count(*)::integer,
  max(w.created_at)
FROM public.work_report_workers w
WHERE btrim(w.worker_name) <> ''
GROUP BY 1, 2
ON CONFLICT (normalized_worker_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS work_report_material_catalog_usage_idx
  ON public.work_report_material_catalog(active, usage_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS work_report_worker_catalog_usage_idx
  ON public.work_report_worker_catalog(active, usage_count DESC, last_used_at DESC);

NOTIFY pgrst, 'reload schema';
COMMIT;
