# Contributing

## Regole per mantenere il codice sano

### 1. Dimensione dei componenti

- Ogni componente React deve stare sotto le **300 righe**.
- Quando un componente si avvicina alle **250-300 righe**, va scomposto in sotto-componenti prima di aggiungere ulteriore logica.
- Il lint fallisce automaticamente se un file supera il tetto configurato (vedi `eslint.config.js`).
- I sotto-componenti vanno in una sottocartella dedicata (es. `src/components/plant-detail/`), ognuno in un proprio file con props tipizzate esplicitamente.

### 2. Aggiornamento del README

Il README va aggiornato nello stesso commit quando si fa una di queste cose:

- Si aggiunge o rimuove una **variabile d'ambiente** (file `.env` / `import.meta.env`).
- Si crea o modifica una **tabella del database** (migrazione Supabase).
- Si aggiunge o rimuove un **servizio esterno** (es. nuovo provider, nuova API).
- Si cambia la **procedura di deploy** (es. cambio da Cloudflare a un altro host).

### 3. Migrazioni database

- Ogni migrazione è un file SQL numerato in `supabase/migrations/`.
- Mai usare `DROP TABLE`, `DELETE COLUMN`, o cambiare il tipo di una colonna esistente — si perdono dati.
- Sempre abilitare RLS sulle nuove tabelle e scrivere policy con il check `app_members`.
- Non usare transazioni esplicite (`BEGIN`/`COMMIT`/`ROLLBACK`).

### 4. Pre-commit hook

Il progetto usa un git hook pre-commit che esegue `npm run lint`. Se il lint fallisce, il commit viene bloccato. Per configurare i hook dopo aver clonato il repo:

```bash
npm install
npx husky init
echo "npm run lint" > .husky/pre-commit
```

### 5. Stile e convenzioni

- Usa l'alias `@/` per gli import (mappa a `src/`).
- Usa icone da `lucide-react`.
- Non aggiungere commenti se non sono necessari per spiegare un "perché" non ovvio.
- Scrivi codice che matcha le convenzioni già presenti nel codebase.
