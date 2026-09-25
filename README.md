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

- Node.js 20+
- npm

## Ambiente di sviluppo locale

```bash
npm install
npm run dev
```

Il dev server si avvia su `http://localhost:5173`.

## Variabili d'ambiente

Le variabili vanno definite in un file `.env` alla radice del progetto (già presente in produzione). Sono lette tramite `import.meta.env` e usate solo nel codice frontend (prefisso `VITE_`).

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

insurances (polizze generali)         — tabella autonoma

equipment_catalog (marche/modelli)   — tabella autonoma, catalogo condiviso

app_members                          — tabella di autorizzazione: mappa user_id → membri autorizzati
```

Tutte le tabelle hanno **Row Level Security (RLS)** abilitata. L'accesso è consentito solo agli utenti autenticati presenti nella tabella `app_members` (policy `USING (EXISTS (SELECT 1 FROM app_members WHERE user_id = auth.uid()))`).

La migrazione `add_vehicle_ownership_categories_and_costs` aggiunge a `vehicles`
`owner_type` (Privato/Azienda), `insurance_categories` (più garanzie per polizza)
e i costi `tax_cost`, `inspection_cost`, `service_cost`. Le scadenze di bollo
e revisione restano colonne `date`: l'interfaccia salva il primo giorno del
mese scelto e considera l'ultimo giorno del mese per gli avvisi.

Il riepilogo annuale del menu usa l'anno della scadenza per premi, bollo e
revisione e la data dell'ultimo tagliando per il suo costo. Mostra importi
registrati o previsti, non pagamenti contabilizzati né lo storico degli interventi.

Lo storage bucket `solar-archive` è privato e contiene le foto degli impianti (max 10 MB, formati JPEG/PNG/WebP/HEIC).

## Build e deploy

### Build locale

```bash
npm run build
```

Produce la cartella `dist/` con i file statici ottimizzati.

### Deploy su Cloudflare Workers

Il progetto usa Cloudflare Workers con la direttiva `[assets]` in `wrangler.toml`:

```toml
name = "polatordsolar"
compatibility_date = "2024-09-04"

[assets]
directory = "./dist"
```

Per il deploy:

```bash
npm run build
npx wrangler deploy
```

Richiede un account Cloudflare con accesso al Worker `polatordsolar`.

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
