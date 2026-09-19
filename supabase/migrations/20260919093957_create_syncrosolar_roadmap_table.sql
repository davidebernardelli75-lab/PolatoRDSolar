/*
# Create SyncroSolar Roadmap table and auto-populate trigger

## 1. Table
Creates `roadmap_tasks` with RLS, scoped to app_members (same pattern as plants).

## 2. Trigger
A function `auto_populate_roadmap()` fires AFTER INSERT on `plants` and
inserts the 18 standard SyncroSolar tasks (9 Burocrazia + 9 Funzionale).

## 3. Backfill
Backfills the 18 tasks for every existing plant that doesn't have any yet.
*/

CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Burocrazia', 'Funzionale')),
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roadmap_tasks_plant_id_idx ON public.roadmap_tasks(plant_id);
CREATE INDEX IF NOT EXISTS roadmap_tasks_plant_cat_idx ON public.roadmap_tasks(plant_id, category, sort_order);

ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.roadmap_tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.roadmap_tasks TO authenticated;

DROP POLICY IF EXISTS "authorized_all_roadmap_tasks" ON public.roadmap_tasks;
CREATE POLICY "authorized_all_roadmap_tasks" ON public.roadmap_tasks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.app_members WHERE user_id = (SELECT auth.uid())));

-- ── Auto-populate function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_populate_roadmap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.roadmap_tasks (plant_id, category, label, sort_order)
  VALUES
    (NEW.id, 'Burocrazia', 'Documentazione preliminare raccolta', 1),
    (NEW.id, 'Burocrazia', 'Autorizzazione comunale presentata', 2),
    (NEW.id, 'Burocrazia', 'Pratica GSE avviata', 3),
    (NEW.id, 'Burocrazia', 'Connessione richiesta al distributore', 4),
    (NEW.id, 'Burocrazia', 'Schema elettrico approvato', 5),
    (NEW.id, 'Burocrazia', 'Dichiarazione conformità presentata', 6),
    (NEW.id, 'Burocrazia', 'Pratica censimento catasto', 7),
    (NEW.id, 'Burocrazia', 'Polizza assicurativa stipulata', 8),
    (NEW.id, 'Burocrazia', 'Contratto di manutenzione firmato', 9),
    (NEW.id, 'Funzionale', 'Sopralluogo tecnico completato', 1),
    (NEW.id, 'Funzionale', 'Struttura di supporto installata', 2),
    (NEW.id, 'Funzionale', 'Pannelli montati e collegati', 3),
    (NEW.id, 'Funzionale', 'Inverter installato', 4),
    (NEW.id, 'Funzionale', 'Sistema di accumulo collegato', 5),
    (NEW.id, 'Funzionale', 'Messa in terra e protezioni verificate', 6),
    (NEW.id, 'Funzionale', 'Collaudo e prova di funzionamento', 7),
    (NEW.id, 'Funzionale', 'Monitoraggio remoto configurato', 8),
    (NEW.id, 'Funzionale', 'Consegna chiavi e documentazione al cliente', 9);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_populate_roadmap ON public.plants;
CREATE TRIGGER trg_auto_populate_roadmap
  AFTER INSERT ON public.plants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_roadmap();

-- ── Backfill existing plants ─────────────────────────────────────
INSERT INTO public.roadmap_tasks (plant_id, category, label, sort_order)
SELECT p.id, 'Burocrazia', v.label, v.sort_order
FROM public.plants p
CROSS JOIN (VALUES
  (1, 'Documentazione preliminare raccolta'),
  (2, 'Autorizzazione comunale presentata'),
  (3, 'Pratica GSE avviata'),
  (4, 'Connessione richiesta al distributore'),
  (5, 'Schema elettrico approvato'),
  (6, 'Dichiarazione conformità presentata'),
  (7, 'Pratica censimento catasto'),
  (8, 'Polizza assicurativa stipulata'),
  (9, 'Contratto di manutenzione firmato')
) AS v(sort_order, label)
WHERE NOT EXISTS (
  SELECT 1 FROM public.roadmap_tasks rt
  WHERE rt.plant_id = p.id AND rt.category = 'Burocrazia' AND rt.label = v.label
);

INSERT INTO public.roadmap_tasks (plant_id, category, label, sort_order)
SELECT p.id, 'Funzionale', v.label, v.sort_order
FROM public.plants p
CROSS JOIN (VALUES
  (1, 'Sopralluogo tecnico completato'),
  (2, 'Struttura di supporto installata'),
  (3, 'Pannelli montati e collegati'),
  (4, 'Inverter installato'),
  (5, 'Sistema di accumulo collegato'),
  (6, 'Messa in terra e protezioni verificate'),
  (7, 'Collaudo e prova di funzionamento'),
  (8, 'Monitoraggio remoto configurato'),
  (9, 'Consegna chiavi e documentazione al cliente')
) AS v(sort_order, label)
WHERE NOT EXISTS (
  SELECT 1 FROM public.roadmap_tasks rt
  WHERE rt.plant_id = p.id AND rt.category = 'Funzionale' AND rt.label = v.label
);