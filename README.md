# Polato R&D — Dashboard Condivisa

Dashboard web per la gestione di impianti fotovoltaici, pannelli, inverter, accumuli, colonnine di ricarica e parco automezzi. Permette di archiviare i dati tecnici di ogni impianto, scansionare barcode dei pannelli, caricare foto, esportare archivi ZIP e report PDF, e tracciare le scadenze della roadmap burocratica e dei veicoli aziendali.

## Stack tecnico

- **React 18** + **TypeScript** — UI e tipizzazione
- **Vite 5** — bundler e dev server
- **Tailwind CSS 3** — stili
- **Supabase** — database Postgres, autenticazione, storage file (foto)
- **Cloudflare Workers** — hosting e deploy (tramite `wrangler.toml`)
- **lucide-react** — icone
- **jspdf / jszip / file-saver** — generazione PDF ed export ZIP
- **@zxing/library + @undecaf/zbar-wasm** — scansione barcode/QR da foto e camera

## Prerequisiti

- Node.js 22+
- npm

## Ambiente di sviluppo locale

```bash
npm install
npm run dev
```

Il dev server si avvia su `http://localhost:5173`.

## Variabili d'ambiente

Usare `.env.example` come modello e mantenere i valori reali in `.env.local`, che è escluso da Git. Le variabili sono lette tramite `import.meta.env` e usate solo nel codice frontend (prefisso `VITE_`).

| Variabile | Descrizione | Dove reperirla |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del progetto Supabase (es. `https://xxxx.supabase.co`) | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Chiave pubblica anon di Supabase (non è segreta, è pensata per essere esposta nel browser) | Supabase Dashboard → Project Settings → API → anon public key |

Non ci sono altre variabili d'ambiente nel codice. Per le chiavi segrete lato server (service role, chiavi di terze parti) si usano i secrets di Supabase (Edge Functions) o le variabili di ambiente di Cloudflare Workers — mai nel file `.env` frontend.

## Migrazioni Supabase

Le migrazioni si trovano in `supabase/migrations/` e sono file SQL numerati con timestamp. Vengono applicate in ordine tramite la dashboard Supabase (SQL Editor) o tramite il tool MCP di Supabase disponibile in questo ambiente.

### Schema dati principale

```
plants (impianti)
  ├── panels (pannelli)              — FK plant_id → plants.id (CASCADE)
  ├── panel_photos (foto)            — FK plant_id → plants.id (CASCADE), FK panel_id → panels.id (SET NULL)
  ├── plant_inverters (inverter)     — FK plant_id → plants.id (CASCADE)
  ├── plant_storages (accumuli)      — FK plant_id → plants.id (CASCADE)
  ├── plant_chargers (colonnine)     — FK plant_id → plants.id (CASCADE)
  └── roadmap_tasks (roadmap)        — FK plant_id → plants.id (CASCADE)

vehicles (parco automezzi)           — tabella autonoma

equipment_catalog (marche/modelli)   — tabella autonoma, catalogo condiviso

app_members                          — tabella di autorizzazione: mappa user_id → membri autorizzati
```

Tutte le tabelle `public` hanno **Row Level Security (RLS)** abilitata. Il modello distingue amministrazione e operatori: l'amministrazione accede alle funzioni gestionali complete, mentre gli operatori ricevono solo i dati operativi necessari. Le funzioni privilegiate e le policy RLS sono il confine di sicurezza reale; la UI non sostituisce l'autorizzazione DB.

Lo storage bucket `solar-archive` è privato e contiene le foto degli impianti (max 10 MB, formati JPEG/PNG/WebP/HEIC).

## Build e deploy

### Build locale

```bash
npm run build
```

Produce la cartella `dist/` con i file statici ottimizzati.

### Deploy su Cloudflare Workers

Il progetto usa Cloudflare Workers con `worker.js`, static assets, health endpoint, observability e security headers.

Il flusso operativo normale sul Mac è:

```bash
cd ~/Documents/"Polato RD Solar Archive PWA"
polato-update
```

Per una verifica post-deploy:

```bash
bash scripts/polato-verify-production.sh
```

Il comando Wrangler diretto va usato solo per diagnostica o operazioni controllate. Il CI esegue il preflight con Wrangler 4.148.0 e Node 22.

### netlify.toml

Il file `netlify.toml` è ancora presente ma **non è usato in produzione** (il deploy avviene su Cloudflare Workers). È mantenuto come fallback per Netlify in caso di necessità e definisce header di sicurezza (CSP, X-Frame-Options, ecc.). Se non si prevede più di usare Netlify, può essere rimosso.

## Account e proprietà dei servizi

Il progetto dipende dai seguenti servizi esterni. Chi gestisce l'app deve avere accesso a ciascuno:

| Servizio | A cosa serve |
|---|---|
| **Cloudflare Workers** | Hosting e deploy dell'app web |
| **Supabase** | Database Postgres, autenticazione utenti, storage foto |
| **GitHub** | Repository del codice sorgente (se configurato) |

## Verifica di raggiungibilità (checklist manuale)

Controlli rapidi da fare periodicamente per verificare che tutto funzioni:

1. **Login**: apri l'URL di produzione e verifica che la pagina di login carichi e che un login con credenziali valide funzioni.
2. **Dashboard impianti**: dopo il login, verifica che la lista impianti carichi senza errori.
3. **Dettaglio impianto**: apri un impianto e verifica che pannelli, inverter, accumuli e foto si carichino.
4. **Supabase attivo**: nella dashboard Supabase, verifica che il progetto risulti attivo e non in pausa.
5. **Storage foto**: carica una foto di test in un impianto e verifica che appaia nella galleria.
6. **Export**: prova a scaricare l'archivio ZIP e il report PDF di un impianto.
7. **Parco automezzi**: apri la sezione veicoli e verifica che la lista carichi con gli alert di scadenza.


## Operations e disaster recovery

La procedura operativa ufficiale è:

- `docs/OPERATIONS_RUNBOOK.md` — deploy, verifiche, incident response, rollback, sicurezza e manutenzione;
- `docs/BACKUP_DISASTER_RECOVERY.md` — backup, checksum e recovery Supabase.

L'endpoint di health produzione è:

```text
https://polatordsolar.davidebernardelli75.workers.dev/api/health
```
