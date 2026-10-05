BEGIN;

CREATE TABLE IF NOT EXISTS public.work_report_material_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_catalog_id uuid NOT NULL
    REFERENCES public.work_report_material_catalog(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (btrim(code) <> ''),
  code_type text NOT NULL DEFAULT 'SCANNED'
    CHECK (code_type IN ('BARCODE','QR','DATA_MATRIX','SCANNED','MANUAL')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS work_report_material_codes_catalog_idx
  ON public.work_report_material_codes(material_catalog_id);

ALTER TABLE public.work_report_material_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_report_material_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_report_material_codes TO authenticated;

DROP POLICY IF EXISTS work_report_material_codes_member_select ON public.work_report_material_codes;
CREATE POLICY work_report_material_codes_member_select
ON public.work_report_material_codes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.app_members m
    WHERE m.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS work_report_material_codes_admin_all ON public.work_report_material_codes;
CREATE POLICY work_report_material_codes_admin_all
ON public.work_report_material_codes
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

CREATE OR REPLACE FUNCTION public.remember_work_report_material_scan(
  p_code text,
  p_description text,
  p_unit text DEFAULT 'PZ',
  p_code_type text DEFAULT 'SCANNED'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code text := btrim(coalesce(p_code, ''));
  v_description text := regexp_replace(upper(btrim(coalesce(p_description, ''))), '[[:space:]]+', ' ', 'g');
  v_unit text := regexp_replace(upper(btrim(coalesce(p_unit, 'PZ'))), '[[:space:]]+', ' ', 'g');
  v_code_type text := upper(btrim(coalesce(p_code_type, 'SCANNED')));
  v_catalog_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_members m WHERE m.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_code = '' OR v_description = '' THEN
    RAISE EXCEPTION 'Code and description are required';
  END IF;

  IF v_code_type NOT IN ('BARCODE','QR','DATA_MATRIX','SCANNED','MANUAL') THEN
    v_code_type := 'SCANNED';
  END IF;

  SELECT c.material_catalog_id
  INTO v_catalog_id
  FROM public.work_report_material_codes c
  WHERE c.code = v_code
  LIMIT 1;

  IF v_catalog_id IS NOT NULL THEN
    UPDATE public.work_report_material_catalog
    SET
      usage_count = usage_count + 1,
      last_used_at = now(),
      updated_at = now()
    WHERE id = v_catalog_id;

    RETURN v_catalog_id;
  END IF;

  INSERT INTO public.work_report_material_catalog (
    description,
    normalized_description,
    default_unit,
    usage_count,
    last_used_at
  )
  VALUES (
    v_description,
    v_description,
    coalesce(nullif(v_unit, ''), 'PZ'),
    1,
    now()
  )
  ON CONFLICT (normalized_description) DO UPDATE SET
    description = EXCLUDED.description,
    default_unit = CASE
      WHEN public.work_report_material_catalog.default_unit IS NULL
        OR public.work_report_material_catalog.default_unit = ''
      THEN EXCLUDED.default_unit
      ELSE public.work_report_material_catalog.default_unit
    END,
    usage_count = public.work_report_material_catalog.usage_count + 1,
    last_used_at = now(),
    updated_at = now()
  RETURNING id INTO v_catalog_id;

  INSERT INTO public.work_report_material_codes (
    material_catalog_id,
    code,
    code_type,
    created_by
  )
  VALUES (
    v_catalog_id,
    v_code,
    v_code_type,
    auth.uid()
  )
  ON CONFLICT (code) DO NOTHING;

  RETURN v_catalog_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remember_work_report_material_scan(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remember_work_report_material_scan(text, text, text, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
