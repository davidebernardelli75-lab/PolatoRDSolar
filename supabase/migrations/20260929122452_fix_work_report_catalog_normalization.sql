CREATE OR REPLACE FUNCTION public.remember_work_report_material(p_description text, p_unit text DEFAULT 'PZ')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_description text := regexp_replace(upper(btrim(coalesce(p_description, ''))), '[[:space:]]+', ' ', 'g');
  v_unit text := regexp_replace(upper(btrim(coalesce(p_unit, 'PZ'))), '[[:space:]]+', ' ', 'g');
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
  v_name text := regexp_replace(upper(btrim(coalesce(p_worker_name, ''))), '[[:space:]]+', ' ', 'g');
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

  SELECT regexp_replace(upper(btrim(description)), '[[:space:]]+', ' ', 'g'),
         regexp_replace(upper(btrim(unit)), '[[:space:]]+', ' ', 'g')
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

  SELECT regexp_replace(upper(btrim(worker_name)), '[[:space:]]+', ' ', 'g'),
         regexp_replace(upper(btrim(coalesce(rate_type, 'ORDINARIA'))), '[[:space:]]+', ' ', 'g')
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

NOTIFY pgrst, 'reload schema';
