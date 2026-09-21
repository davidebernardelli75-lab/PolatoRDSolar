-- Replace "Pratica censimento catasto" and "Polizza assicurativa stipulata"
-- with "Pratica ENEA" and "Verbale allaccio impianto" in Burocrazia tasks.

-- 1) Delete the two removed tasks for all plants
DELETE FROM public.roadmap_tasks
WHERE category = 'Burocrazia'
  AND label IN ('Pratica censimento catasto', 'Polizza assicurativa stipulata');

-- 2) Add the two new tasks for every plant that doesn't have them yet
INSERT INTO public.roadmap_tasks (plant_id, category, label, sort_order)
SELECT p.id, 'Burocrazia', v.label, v.sort_order
FROM public.plants p
CROSS JOIN (VALUES
  (7, 'Pratica ENEA'),
  (8, 'Verbale allaccio impianto')
) AS v(sort_order, label)
WHERE NOT EXISTS (
  SELECT 1 FROM public.roadmap_tasks rt
  WHERE rt.plant_id = p.id AND rt.category = 'Burocrazia' AND rt.label = v.label
);

-- 3) Update the auto-populate trigger function so new plants get the new list
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
    (NEW.id, 'Burocrazia', 'Pratica ENEA', 7),
    (NEW.id, 'Burocrazia', 'Verbale allaccio impianto', 8),
    (NEW.id, 'Burocrazia', 'Contratto di manutenzione firmato', 9),
    (NEW.id, 'Funzionale', 'Sopralluogo tecnico completato', 1),
    (NEW.id, 'Funzionale', 'Struttura di supporto installata', 2),
    (NEW.id, 'Funzionale', 'Pannelli montati e collegati', 3),
    (NEW.id, 'Funzionale', 'Inverter installato', 4),
    (NEW.id, 'Funzionale', 'Sistema di accumuto collegato', 5),
    (NEW.id, 'Funzionale', 'Messa in terra e protezioni verificate', 6),
    (NEW.id, 'Funzionale', 'Collaudo e prova di funzionamento', 7),
    (NEW.id, 'Funzionale', 'Monitoraggio remoto configurato', 8),
    (NEW.id, 'Funzionale', 'Consegna chiavi e documentazione al cliente', 9);
  RETURN NEW;
END;
$$;
