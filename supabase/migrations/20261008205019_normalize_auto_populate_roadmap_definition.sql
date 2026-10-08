-- Normalize the textual definition of auto_populate_roadmap so fresh/shadow
-- database replays match the production function definition byte-for-byte.
-- Functional behavior is unchanged.

CREATE OR REPLACE FUNCTION public.auto_populate_roadmap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

REVOKE EXECUTE ON FUNCTION public.auto_populate_roadmap() FROM PUBLIC, anon, authenticated;
