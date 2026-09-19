/*
# Create SyncroSolar Roadmap

## Purpose
Creates a per-plant checklist roadmap called "SyncroSolar" that tracks the
bureaucratic and functional progress of each solar installation. Each plant
gets a set of predefined tasks (pre-filled) that users validate with a
checkmark. The completion percentage is calculated from how many tasks are
checked.

## New Tables

### `roadmap_tasks`
- `id` (uuid, primary key)
- `plant_id` (uuid, FK to plants, ON DELETE CASCADE)
- `category` (text) — groups tasks into sections: "Burocrazia" or "Funzionale"
- `label` (text) — the task description
- `sort_order` (int) — ordering within a category
- `completed` (boolean, default false)
- `completed_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security
- RLS enabled on `roadmap_tasks`.
- Access scoped to authenticated users who are members of `app_members`,
  matching the existing pattern used by plants/panels/photos.
- Uses `FOR ALL` policy with `app_members` membership check (consistent
  with the existing `authorized_all_*` policies on other tables).

## Auto-population
A trigger function `auto_populate_roadmap()` fires AFTER INSERT on `plants`
to pre-fill the standard SyncroSolar task list for every new plant.

## Standard task list (18 tasks)
### Burocrazia (9 tasks)
1. Documentazione preliminare raccolta
2. Autorizzazione comunale presentata
3. Pratica GSE avviata
4. Connessione richiesta al distributore
5. Schema elettrico approvato
6. Dichiarazione conformità presentata
7. Pratica censimento catasto
8. Polizza assicurativa stipulata
9. Contratto di manutenzione firmato

### Funzionale (9 tasks)
10. Sopralluogo tecnico completato
11. Struttura di supporto installata
12. Pannelli montati e collegati
13. Inverter installato
14. Sistema di accumulo collegato
15. Messa in terra e protezioni verificate
16. Collaudo e prova di funzionamento
17. Monitoraggio remoto configurato
18. Consegna chiavi e documentazione al cliente
*/