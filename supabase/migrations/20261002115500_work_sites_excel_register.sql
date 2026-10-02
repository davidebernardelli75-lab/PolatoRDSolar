BEGIN;

CREATE TABLE IF NOT EXISTS public.work_site_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL CHECK (field_key IN ('CATEGORY','SITE_STATUS','PHASE_PROGRESS_STATUS','PHASE_BILLING_STATUS')),
  label text NOT NULL CHECK (btrim(label) <> ''),
  normalized_label text GENERATED ALWAYS AS (
    upper(regexp_replace(btrim(label), '[[:space:]]+', ' ', 'g'))
  ) STORED,
  sort_order integer NOT NULL DEFAULT 100,
  is_custom boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_key, normalized_label)
);

CREATE TABLE IF NOT EXISTS public.work_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  location text,
  category text NOT NULL DEFAULT 'DA DEFINIRE',
  site_status text NOT NULL DEFAULT 'DA INIZIARE',
  start_date date,
  start_date_note text,
  planned_end_date date,
  quote_request_id uuid UNIQUE REFERENCES public.quote_requests(id) ON DELETE RESTRICT,
  plant_id uuid REFERENCES public.plants(id) ON DELETE SET NULL,
  notes text,
  active boolean NOT NULL DEFAULT true,
  source_name text,
  source_group text,
  source_excel_id text,
  source_row_number integer,
  import_key text UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_site_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  phase_key text NOT NULL CHECK (btrim(phase_key) <> ''),
  phase_label text NOT NULL CHECK (btrim(phase_label) <> ''),
  weight_percent numeric(6,2) NOT NULL CHECK (weight_percent >= 0 AND weight_percent <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  progress_status text NOT NULL DEFAULT 'NON INIZIATO',
  billing_status text NOT NULL DEFAULT 'DA FATTURARE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, phase_key)
);

CREATE INDEX IF NOT EXISTS work_sites_status_idx ON public.work_sites(site_status);
CREATE INDEX IF NOT EXISTS work_sites_category_idx ON public.work_sites(category);
CREATE INDEX IF NOT EXISTS work_sites_quote_idx ON public.work_sites(quote_request_id);
CREATE INDEX IF NOT EXISTS work_sites_plant_idx ON public.work_sites(plant_id);
CREATE INDEX IF NOT EXISTS work_site_phases_site_idx ON public.work_site_phases(site_id);

ALTER TABLE public.work_reports
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.work_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS work_reports_site_idx ON public.work_reports(site_id);

ALTER TABLE public.work_site_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_site_phases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_site_options, public.work_sites, public.work_site_phases
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_site_options, public.work_sites, public.work_site_phases
  TO authenticated;

DROP POLICY IF EXISTS work_site_options_admin_all ON public.work_site_options;
CREATE POLICY work_site_options_admin_all
ON public.work_site_options
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_sites_admin_all ON public.work_sites;
CREATE POLICY work_sites_admin_all
ON public.work_sites
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS work_site_phases_admin_all ON public.work_site_phases;
CREATE POLICY work_site_phases_admin_all
ON public.work_site_phases
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

INSERT INTO public.work_site_options(field_key, label, sort_order, is_custom)
VALUES
  ('CATEGORY','CIVILE',10,false),
  ('CATEGORY','INDUSTRIALE',20,false),
  ('CATEGORY','FOTOVOLTAICO',30,false),
  ('CATEGORY','MANUTENZIONE',40,false),
  ('CATEGORY','DA DEFINIRE',90,false),
  ('SITE_STATUS','DA INIZIARE',10,false),
  ('SITE_STATUS','IN CORSO',20,false),
  ('SITE_STATUS','SOSPESO',30,false),
  ('SITE_STATUS','COMPLETATO',40,false),
  ('PHASE_PROGRESS_STATUS','NON INIZIATO',10,false),
  ('PHASE_PROGRESS_STATUS','IN CORSO',20,false),
  ('PHASE_PROGRESS_STATUS','COMPLETATO',30,false),
  ('PHASE_BILLING_STATUS','DA FATTURARE',10,false),
  ('PHASE_BILLING_STATUS','PARZIALMENTE FATTURATO',20,false),
  ('PHASE_BILLING_STATUS','FATTURATO',30,false),
  ('PHASE_BILLING_STATUS','NON FATTURABILE',40,false)
ON CONFLICT (field_key, normalized_label) DO NOTHING;

CREATE OR REPLACE FUNCTION public.initialize_work_site_phases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.work_site_phases(site_id, phase_key, phase_label, weight_percent, sort_order)
  VALUES
    (NEW.id,'TRACCIATURA','TRACCIATURA',5,10),
    (NEW.id,'POSA_TUBI','POSA TUBI',20,20),
    (NEW.id,'POSA_FILI','POSA FILI',25,30),
    (NEW.id,'POSA_FRUTTI','POSA FRUTTI',30,40),
    (NEW.id,'CABLAGGIO_CENTRALINO','CABLAGGIO CENTRALINO',5,50),
    (NEW.id,'GIUNZIONI','GIUNZIONI',5,60),
    (NEW.id,'COLLAUDO_CANTIERE','COLLAUDO CANTIERE',5,70),
    (NEW.id,'EXTRA_RICHIESTI','EXTRA RICHIESTI',5,80)
  ON CONFLICT (site_id, phase_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_sites_initialize_phases ON public.work_sites;
CREATE TRIGGER work_sites_initialize_phases
AFTER INSERT ON public.work_sites
FOR EACH ROW EXECUTE FUNCTION public.initialize_work_site_phases();

CREATE OR REPLACE FUNCTION public.sync_work_report_quote_from_site()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.site_id IS NOT NULL THEN
    SELECT s.quote_request_id INTO NEW.quote_request_id
    FROM public.work_sites s
    WHERE s.id = NEW.site_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_reports_sync_site_quote ON public.work_reports;
CREATE TRIGGER work_reports_sync_site_quote
BEFORE INSERT OR UPDATE OF site_id ON public.work_reports
FOR EACH ROW EXECUTE FUNCTION public.sync_work_report_quote_from_site();

CREATE OR REPLACE FUNCTION public.sync_site_quote_to_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.quote_request_id IS DISTINCT FROM NEW.quote_request_id THEN
    UPDATE public.work_reports
       SET quote_request_id = NEW.quote_request_id,
           updated_at = now()
     WHERE site_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_sites_sync_quote_reports ON public.work_sites;
CREATE TRIGGER work_sites_sync_quote_reports
AFTER UPDATE OF quote_request_id ON public.work_sites
FOR EACH ROW EXECUTE FUNCTION public.sync_site_quote_to_reports();

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
  IF v_field NOT IN ('CATEGORY','SITE_STATUS','PHASE_PROGRESS_STATUS','PHASE_BILLING_STATUS') THEN
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

DROP FUNCTION IF EXISTS public.list_work_report_sites();

CREATE FUNCTION public.list_work_report_sites()
RETURNS TABLE (
  site_id uuid,
  name text,
  location text,
  category text,
  site_status text,
  report_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    s.id,
    s.name,
    s.location,
    s.category,
    s.site_status,
    (
      SELECT count(*)::integer
      FROM public.work_reports r
      WHERE r.site_id = s.id
    ) AS report_count
  FROM public.work_sites s
  WHERE s.active
    AND (
      (SELECT polato_internal.is_polato_admin())
      OR EXISTS (
        SELECT 1 FROM public.app_members m
        WHERE m.user_id = (SELECT auth.uid())
      )
    )
  ORDER BY
    CASE upper(s.site_status)
      WHEN 'IN CORSO' THEN 1
      WHEN 'DA INIZIARE' THEN 2
      WHEN 'SOSPESO' THEN 3
      WHEN 'COMPLETATO' THEN 4
      ELSE 5
    END,
    s.name;
$$;

REVOKE ALL ON FUNCTION public.list_work_report_sites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_work_report_sites() TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_work_site_group(p_site_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  DELETE FROM public.work_reports WHERE site_id = p_site_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  DELETE FROM public.work_sites WHERE id = p_site_id;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_work_site_group(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_work_site_group(uuid) TO authenticated;

INSERT INTO public.work_sites(name, location, category, site_status, quote_request_id, source_name, import_key)
SELECT q.client, NULL, 'DA DEFINIRE', 'IN CORSO', q.id, 'BACKFILL RAPPORTINI', 'REPORT_QUOTE:' || q.id::text
FROM public.quote_requests q
WHERE EXISTS (SELECT 1 FROM public.work_reports r WHERE r.quote_request_id = q.id)
  AND NOT EXISTS (SELECT 1 FROM public.work_sites s WHERE s.quote_request_id = q.id)
ON CONFLICT DO NOTHING;

UPDATE public.work_reports r
SET site_id = s.id
FROM public.work_sites s
WHERE r.site_id IS NULL
  AND r.quote_request_id IS NOT NULL
  AND s.quote_request_id = r.quote_request_id;

WITH imported(source_row_number,source_excel_id,source_group,name,location,category,site_status,start_date,start_date_note,planned_end_date,phase_statuses) AS (
  VALUES
(4,'1','CIVILE','Furlani Andrea','Valeggio','CIVILE','IN CORSO','2026-09-01'::date,NULL,'2026-11-15'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','NON INIZIATO']::text[]),
(6,'2','CIVILE','Marchi Valentina','Loc. Pasini, Valeggio','CIVILE','IN CORSO','2026-08-10'::date,NULL,'2026-12-20'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO']::text[]),
(8,'3','CIVILE','Oliosi Daniele (Intech)','San Giovanni Lupatoto','CIVILE','IN CORSO','2026-10-05'::date,NULL,'2026-12-30'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO']::text[]),
(10,'4','CIVILE','Miotto Stefano','Montericco','CIVILE','IN CORSO','2026-07-15'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','IN CORSO']::text[]),
(12,'5','CIVILE','Lorella Ugo Foscolo','Verona','CIVILE','IN CORSO','2026-04-09'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(14,'6','CIVILE','Architetto Martinelli','Valeggio','CIVILE','IN CORSO','2026-05-15'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(16,'7','CIVILE','Melita Borgo Trento (Intech)','Verona','CIVILE','IN CORSO','2026-08-06'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(18,'8','CIVILE','Pirlette','Desenzano','CIVILE','IN CORSO','2026-07-22'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(20,'9','CIVILE','Samuele','Castelnuovo','CIVILE','IN CORSO','2026-03-30'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(22,'10','CIVILE','Villa Brentani','Sant''Ambrogio','CIVILE','IN CORSO',NULL::date,'2024','2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO']::text[]),
(24,'11','CIVILE','Luciana Franchini','Quaderni','CIVILE','DA INIZIARE','2026-09-04'::date,NULL,'2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(26,'11','CIVILE','Lonardi/ Zarantonello','Custoza','CIVILE','DA INIZIARE','2026-10-01'::date,NULL,'2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(29,'8','INDUSTRIALE','GECOS GOITO','Goito','INDUSTRIALE','IN CORSO','2026-07-15'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO']::text[]),
(31,'9','INDUSTRIALE','DE BORTOLI/ CORDIOLI STEFANO','Villafranca','INDUSTRIALE','IN CORSO','2026-07-15'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO']::text[]),
(33,'10','INDUSTRIALE','GECOS CREMONA','Cremona','INDUSTRIALE','IN CORSO','2026-07-15'::date,NULL,'2026-10-10'::date,ARRAY['IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(35,'11','INDUSTRIALE','INPS MANTOVA','Mantova','INDUSTRIALE','IN CORSO','2026-07-15'::date,NULL,'2026-10-10'::date,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO','NON INIZIATO']::text[]),
(39,'8','DA INIZIARE','PASINI CONTESSINE','Valeggio','DA DEFINIRE','DA INIZIARE','2026-09-01'::date,NULL,'2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(41,'9','DA INIZIARE','CATANIA GIORGIA (LUDOVICO)','Villafranca','DA DEFINIRE','DA INIZIARE','2026-09-01'::date,NULL,'2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(43,'10','DA INIZIARE','ZAMPIERI ALESSANDRA (INTECH)','Buttapietra','DA DEFINIRE','DA INIZIARE','2026-09-01'::date,NULL,'2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(45,'11','DA INIZIARE','BENINCASA RIF. STEFANO PAVIMENTISTA','Costermano','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(47,'11','DA INIZIARE','CORTE DEI CONTI','Quaderni','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(49,'11','DA INIZIARE','ALDEGHERI GIOVANNA RIF. MB MOTORI','Lugagnano','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(51,'11','DA INIZIARE','LUCA MAZZI','Valeggio','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(53,'11','DA INIZIARE','EFFE A 3 UNITA''','Marmirolo','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(55,'11','DA INIZIARE','3 UNITA'' INTECH TOSCOLANO','Toscolano Maderno','DA DEFINIRE','DA INIZIARE','2026-11-01'::date,NULL,'2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(57,'11','DA INIZIARE','PALAZZO CARLOTTA 5 UNITA''','Valeggio','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(59,'11','DA INIZIARE','LUCA MAZZI','Valeggio','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(61,'11','DA INIZIARE','LUCA MAZZI','Valeggio','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(63,'11','DA INIZIARE','LUCA MAZZI','Valeggio','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(65,'11','DA INIZIARE','LUCA MAZZI','Valeggio','DA DEFINIRE','DA INIZIARE',NULL::date,'?','2026-10-10'::date,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[])
)
INSERT INTO public.work_sites(
  import_key,name,location,category,site_status,start_date,start_date_note,planned_end_date,
  source_name,source_group,source_excel_id,source_row_number
)
SELECT
  'CANTIERI_2026_ROW_' || source_row_number::text,
  name,location,category,site_status,start_date,start_date_note,planned_end_date,
  'CANTIERI 2026.xlsx',source_group,source_excel_id,source_row_number
FROM imported
ON CONFLICT (import_key) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  category = EXCLUDED.category,
  site_status = EXCLUDED.site_status,
  start_date = EXCLUDED.start_date,
  start_date_note = EXCLUDED.start_date_note,
  planned_end_date = EXCLUDED.planned_end_date,
  source_group = EXCLUDED.source_group,
  source_excel_id = EXCLUDED.source_excel_id,
  source_row_number = EXCLUDED.source_row_number,
  updated_at = now();

WITH candidates AS (
  SELECT s.id AS site_id, s.source_row_number, q.id AS quote_id
  FROM public.work_sites s
  JOIN public.quote_requests q
    ON q.status = 'ACCETTATO'
   AND regexp_replace(upper(s.name), '[^A-Z0-9]', '', 'g')
       = regexp_replace(upper(q.client), '[^A-Z0-9]', '', 'g')
  WHERE s.quote_request_id IS NULL
    AND s.source_name = 'CANTIERI 2026.xlsx'
),
unique_per_site AS (
  SELECT site_id, min(source_row_number) AS source_row_number, (array_agg(quote_id))[1] AS quote_id
  FROM candidates
  GROUP BY site_id
  HAVING count(*) = 1
),
ranked AS (
  SELECT *, row_number() OVER (PARTITION BY quote_id ORDER BY source_row_number, site_id) AS quote_rank
  FROM unique_per_site
)
UPDATE public.work_sites s
SET quote_request_id = r.quote_id,
    updated_at = now()
FROM ranked r
WHERE s.id = r.site_id
  AND r.quote_rank = 1;

INSERT INTO public.work_sites(name, category, site_status, quote_request_id, source_name, import_key)
SELECT q.client, 'DA DEFINIRE', 'DA INIZIARE', q.id, 'PREVENTIVO ACCETTATO', 'QUOTE:' || q.id::text
FROM public.quote_requests q
WHERE q.status = 'ACCETTATO'
  AND NOT EXISTS (SELECT 1 FROM public.work_sites s WHERE s.quote_request_id = q.id)
ON CONFLICT DO NOTHING;

WITH imported(source_row_number,phase_statuses) AS (
  VALUES
(4,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','NON INIZIATO']::text[]),
(6,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO']::text[]),
(8,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO']::text[]),
(10,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','IN CORSO']::text[]),
(12,ARRAY['COMPLETATO','COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(14,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(16,ARRAY['COMPLETATO','COMPLETATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(18,ARRAY['COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(20,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(22,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO','COMPLETATO','IN CORSO','NON INIZIATO','NON INIZIATO']::text[]),
(24,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(26,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(29,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','IN CORSO']::text[]),
(31,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO']::text[]),
(33,ARRAY['IN CORSO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(35,ARRAY['COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','COMPLETATO','NON INIZIATO','NON INIZIATO']::text[]),
(39,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(41,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(43,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(45,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(47,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(49,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(51,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(53,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(55,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(57,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(59,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(61,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(63,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[]),
(65,ARRAY['NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO','NON INIZIATO']::text[])
),
phase_order(phase_key,ordinality) AS (
  VALUES
    ('TRACCIATURA',1),
    ('POSA_TUBI',2),
    ('POSA_FILI',3),
    ('POSA_FRUTTI',4),
    ('CABLAGGIO_CENTRALINO',5),
    ('GIUNZIONI',6),
    ('COLLAUDO_CANTIERE',7),
    ('EXTRA_RICHIESTI',8)
),
expanded AS (
  SELECT
    'CANTIERI_2026_ROW_' || i.source_row_number::text AS import_key,
    p.phase_key,
    i.phase_statuses[p.ordinality] AS progress_status
  FROM imported i
  CROSS JOIN phase_order p
)
UPDATE public.work_site_phases ph
SET progress_status = e.progress_status,
    billing_status = 'DA FATTURARE',
    updated_at = now()
FROM expanded e
JOIN public.work_sites s ON s.import_key = e.import_key
WHERE ph.site_id = s.id
  AND ph.phase_key = e.phase_key;

NOTIFY pgrst, 'reload schema';

COMMIT;
