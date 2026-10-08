BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  normalized_label text GENERATED ALWAYS AS (
    upper(regexp_replace(btrim(label), '[[:space:]]+', ' ', 'g'))
  ) STORED,
  color_key text NOT NULL DEFAULT 'slate',
  icon_key text NOT NULL DEFAULT 'star',
  sort_order integer NOT NULL DEFAULT 100,
  is_custom boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_event_categories_label_not_blank CHECK (btrim(label) <> ''),
  CONSTRAINT calendar_event_categories_color_key_check CHECK (
    color_key IN ('red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose','slate')
  ),
  CONSTRAINT calendar_event_categories_icon_key_check CHECK (
    icon_key IN (
      'hourglass','helmet','solar','tools','toolbox','meeting','delivery','shopping','phone',
      'quote','money','training','documents','shield','car-service','van','admin','urgent',
      'birthday','heart','party','reminder','holiday','permit','sick','star'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS calendar_event_categories_normalized_label_uidx
  ON public.calendar_event_categories(normalized_label);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.calendar_event_categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  all_day boolean NOT NULL DEFAULT false,
  notes text,
  reminder_minutes integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT calendar_events_reminder_minutes_check CHECK (
    reminder_minutes IS NULL OR (reminder_minutes >= 0 AND reminder_minutes <= 525600)
  ),
  CONSTRAINT calendar_events_time_consistency CHECK (
    (all_day = true AND start_time IS NULL) OR all_day = false
  )
);

CREATE INDEX IF NOT EXISTS calendar_events_date_idx
  ON public.calendar_events(event_date, start_time);

CREATE INDEX IF NOT EXISTS calendar_events_category_idx
  ON public.calendar_events(category_id);

ALTER TABLE public.calendar_event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.calendar_event_categories FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.calendar_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;

DROP POLICY IF EXISTS calendar_categories_admin_all ON public.calendar_event_categories;
CREATE POLICY calendar_categories_admin_all
ON public.calendar_event_categories
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

DROP POLICY IF EXISTS calendar_events_admin_all ON public.calendar_events;
CREATE POLICY calendar_events_admin_all
ON public.calendar_events
FOR ALL TO authenticated
USING ((SELECT polato_internal.is_polato_admin()))
WITH CHECK ((SELECT polato_internal.is_polato_admin()));

INSERT INTO public.calendar_event_categories(label, color_key, icon_key, sort_order, is_custom)
VALUES
  ('Scadenza pratica',        'red',     'hourglass',   10, false),
  ('Sopralluogo',             'blue',    'helmet',      20, false),
  ('Installazione',           'amber',   'solar',       30, false),
  ('Manutenzione',            'orange',  'tools',       40, false),
  ('Intervento tecnico',      'rose',    'toolbox',     50, false),
  ('Riunione',                'violet',  'meeting',     60, false),
  ('Consegna materiale',      'yellow',  'delivery',    70, false),
  ('Ordine / acquisto',       'cyan',    'shopping',    80, false),
  ('Richiamo cliente',        'teal',    'phone',       90, false),
  ('Preventivo da seguire',   'sky',     'quote',      100, false),
  ('Pagamento / incasso',     'green',   'money',      110, false),
  ('Formazione / corso',      'indigo',  'training',   120, false),
  ('Controllo documenti',     'slate',   'documents',  130, false),
  ('Scadenza assicurazione',  'red',     'shield',     140, false),
  ('Scadenza revisione',      'orange',  'car-service',150, false),
  ('Scadenza mezzo',          'amber',   'van',        160, false),
  ('Task amministrativo',     'blue',    'admin',      170, false),
  ('Task urgente',            'fuchsia', 'urgent',     180, false),
  ('Compleanno',              'pink',    'birthday',   190, false),
  ('Anniversario',            'rose',    'heart',      200, false),
  ('Evento personale',        'purple',  'party',      210, false),
  ('Promemoria',              'yellow',  'reminder',   220, false),
  ('Ferie',                   'lime',    'holiday',    230, false),
  ('Permesso',                'sky',     'permit',     240, false),
  ('Malattia',                'slate',   'sick',       250, false)
ON CONFLICT (normalized_label) DO NOTHING;

CREATE OR REPLACE FUNCTION public.remember_calendar_custom_category(p_label text)
RETURNS public.calendar_event_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_label text;
  v_normalized text;
  v_hash integer;
  v_colors text[] := ARRAY['teal','violet','orange','sky','emerald','fuchsia','amber','indigo','rose','cyan'];
  v_icons text[] := ARRAY['star','party','reminder','documents','meeting','urgent','admin','delivery','heart','shopping'];
  v_row public.calendar_event_categories;
BEGIN
  IF NOT polato_internal.is_polato_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  v_label := regexp_replace(btrim(coalesce(p_label, '')), '[[:space:]]+', ' ', 'g');
  IF v_label = '' THEN
    RAISE EXCEPTION 'Category label is required';
  END IF;

  v_normalized := upper(v_label);

  SELECT *
  INTO v_row
  FROM public.calendar_event_categories
  WHERE normalized_label = v_normalized
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.calendar_event_categories
    SET active = true, updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  v_hash := abs(hashtext(v_normalized));

  INSERT INTO public.calendar_event_categories(
    label,
    color_key,
    icon_key,
    sort_order,
    is_custom,
    active
  )
  VALUES (
    v_label,
    v_colors[(v_hash % array_length(v_colors, 1)) + 1],
    v_icons[(v_hash % array_length(v_icons, 1)) + 1],
    1000,
    true,
    true
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.remember_calendar_custom_category(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remember_calendar_custom_category(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
