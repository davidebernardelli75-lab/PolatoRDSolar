# Polato R&D — Operations Runbook

## Scopo

Questo documento è la procedura operativa ufficiale per mantenere, aggiornare e recuperare l'applicazione Polato R&D in produzione.

L'obiettivo è semplice: il codice resta governato da GitHub, i dati da Supabase, il runtime da Cloudflare Workers e le modifiche passano da branch, PR, controlli automatici e merge su `main`.

L'utente operativo non deve modificare file sorgente, SQL o Git manualmente.

## Riferimenti di produzione

- Repository GitHub: `davidebernardelli75-lab/PolatoRDSolar`
- Branch di produzione: `main`
- Worker Cloudflare: `polatordsolar`
- URL produzione: `https://polatordsolar.davidebernardelli75.workers.dev`
- Health endpoint: `/api/health`
- Progetto Supabase: `Polato R&D Gestionale Azienda`
- Supabase project ref: `fjmrfxjvqsdrwjucgzla`
- Backup off-site locale: `~/Desktop/Backup-Polato-Supabase`

## Regole non negoziabili

1. Non modificare direttamente la produzione quando una modifica può essere versionata.
2. Ogni modifica DB deve avere una migration SQL nel repository.
3. Non usare mai `supabase db reset --linked` sul progetto di produzione.
4. RLS è il confine di sicurezza reale. Nascondere una voce UI non è una misura di autorizzazione.
5. Non esporre `service_role`, secret key o credenziali privilegiate nel frontend.
6. Prima di migrazioni invasive o interventi sui dati eseguire un backup.
7. Non fare rollback del codice alla cieca se una release ha anche modificato lo schema DB.
8. Non eliminare indici o dati reali solo sulla base di un advisor: prima verificare l'uso reale.

## Flusso normale di sviluppo e rilascio

Il flusso standard è:

1. leggere la `main` reale;
2. creare un branch dedicato;
3. implementare la modifica;
4. aggiungere una migration Supabase se necessaria;
5. verificare RLS, permessi e compatibilità;
6. aprire PR;
7. attendere i workflow pertinenti;
8. verificare diff e mergeability;
9. squash merge su `main`;
10. aggiornare e distribuire dal Mac con `polato-update`;
11. verificare la produzione.

Comando abituale sul Mac:

```bash
cd ~/Documents/"Polato RD Solar Archive PWA"
polato-update
```

Subito dopo un deploy importante:

```bash
bash scripts/polato-verify-production.sh
```

L'output corretto termina con:

```text
PRODUZIONE VERIFICATA
Health: OK
Security headers: OK
```

## Requisiti locali

- macOS compatibile con Wrangler corrente;
- Node.js 22;
- npm;
- Supabase CLI;
- Rancher Desktop/Docker per i backup Supabase;
- autenticazione Cloudflare Wrangler;
- repository Git locale aggiornato.

Per Node:

```bash
source ~/.nvm/nvm.sh
nvm use 22
node -v
```

## Gate automatico prima del merge

Il workflow `Production readiness gate` controlla:

- assenza di file `.env` tracciati;
- assenza di credenziali privilegiate nel codice browser;
- nomi e timestamp delle migration Supabase;
- `npm audit --omit=dev --audit-level=high`;
- TypeScript con esclusione dei due errori baseline documentati;
- sintassi degli script operativi;
- build Vite;
- budget massimo di 500 kB per ogni chunk JavaScript;
- health endpoint Worker;
- security headers e confine CORS;
- dry-run Cloudflare Wrangler.

Una PR non va mergiata se introduce errori nuovi in questi controlli.

## Baseline TypeScript nota

Restano due errori raw preesistenti su `main`:

- `src/components/PlantEditor.tsx` — TS2345;
- `src/lib/use-equipment-options.ts` — TS2345.

Il workflow li riconosce come baseline nota, ma fallisce se compaiono nuovi errori TypeScript.

Questi due errori vanno trattati separatamente quando si decide di azzerare il debito tecnico residuo.

## Sicurezza e accessi

### Amministrazione

Può accedere a:

- impianti FV;
- cantieri;
- rapportini;
- preventivi;
- calendario;
- automezzi;
- assicurazioni;
- formazione;
- dati economici e costi.

### Operatori

Devono accedere solo alle funzioni operative necessarie:

- impianti FV;
- rapportini;
- riferimenti cantiere filtrati necessari alla compilazione.

Non devono poter leggere direttamente:

- preventivi;
- margini;
- costi;
- veicoli;
- assicurazioni;
- formazione;
- calendario amministrativo;
- audit log.

La funzione `polato_internal.is_polato_admin()` richiede ruolo admin e una sessione ancora presente in `auth.sessions`.

## Audit

La tabella `public.admin_audit_log` registra metadati delle modifiche critiche:

- utente;
- ruolo;
- sessione;
- operazione;
- tabella;
- record;
- colonne modificate.

Non duplica intenzionalmente valori economici, contatti o note.

L'audit parte dalla data di introduzione della FASE 7 e non ricostruisce eventi precedenti.

## Health e observability

Endpoint:

```text
https://polatordsolar.davidebernardelli75.workers.dev/api/health
```

Stato sano:

```json
{
  "status": "ok",
  "service": "polatordsolar",
  "edge": "ok",
  "assets": "ok"
}
```

Il health endpoint verifica Worker e asset statici. Non è un health check completo di Supabase.

Il Worker invia errori client sanitizzati a `/api/client-error`; email, UUID, token JWT e chiavi Supabase vengono redatti prima del logging.

Cloudflare Observability è attiva.

Il workflow `Production uptime monitor` è configurato per controllare l'health ogni 30 minuti e aprire un issue GitHub in caso di fallimento.

## Security headers

Il Worker applica in produzione:

- Content-Security-Policy;
- HSTS;
- X-Frame-Options;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy;
- COOP/CORP.

Le API Worker browser sono same-origin. Supabase hosted mantiene il proprio CORS; la protezione dei dati è demandata a chiave pubblica, autenticazione e RLS.

## Backup ordinario

Procedura completa:

```bash
bash scripts/polato-backup.sh
```

Destinazione predefinita:

```text
~/Desktop/Backup-Polato-Supabase/YYYY-MM-DD_HH-MM-SS/
```

Il backup contiene:

- ruoli;
- schema;
- dati DB;
- Auth esplicito;
- metadata Storage;
- migration history;
- file fisici dei bucket;
- manifest;
- checksum SHA-256.

Frequenza operativa consigliata:

- almeno una volta al giorno nei giorni di utilizzo;
- sempre prima di una migrazione invasiva;
- conservare più generazioni;
- mantenere almeno una copia fisicamente separata dal Mac.

Dettagli completi: `docs/BACKUP_DISASTER_RECOVERY.md`.

## Verifica backup

Ogni backup deve terminare con:

```text
BACKUP COMPLETATO
Verifica: OK
Auth: incluso e verificato
Storage metadata: incluso e verificato
```

Per una verifica successiva:

```bash
cd ~/Desktop/Backup-Polato-Supabase/<backup>
shasum -a 256 -c checksums.sha256
```

## Incident response

### Caso A — il sito non si apre

1. eseguire:

```bash
bash scripts/polato-verify-production.sh
```

2. se l'health fallisce, controllare il deployment Cloudflare;
3. se necessario, verificare le versioni recenti del Worker;
4. se il problema è chiaramente introdotto dall'ultimo deploy e non dipende da una migration DB, eseguire un rollback Cloudflare.

Diagnostica:

```bash
npx --yes wrangler@4.148.0 deployments status --name polatordsolar
npx --yes wrangler@4.148.0 versions list --name polatordsolar
```

Rollback a una versione specifica:

```bash
npx --yes wrangler@4.148.0 rollback <VERSION_ID> --name polatordsolar --message "Rollback incidente produzione"
```

Un rollback Worker cambia immediatamente la versione attiva. Non ripristina il database.

### Caso B — health OK ma i dati non caricano

Probabile area da verificare:

- stato progetto Supabase;
- Auth/sessioni;
- query/RLS;
- Storage;
- log errori.

Non modificare RLS o ruoli per aggirare rapidamente un errore. Prima va identificata la causa.

### Caso C — accesso amministrativo sospetto

1. revocare la sessione compromessa;
2. cambiare la password;
3. verificare `auth.sessions`;
4. controllare `app_user_roles`;
5. consultare `admin_audit_log`;
6. verificare che l'operatore non abbia visibilità su tabelle amministrative.

### Caso D — errore dati o cancellazione

1. non eseguire ulteriori operazioni distruttive;
2. creare subito un nuovo backup dello stato attuale se possibile;
3. identificare il backup sano precedente;
4. ripristinare prima in un progetto Supabase isolato;
5. confrontare conteggi e dati;
6. spostare il traffico solo dopo la verifica.

Non ripristinare un dump direttamente sulla produzione senza una procedura controllata.

## Rollback e migration DB

Un rollback del Worker è sicuro solo quando la versione precedente è compatibile con lo schema DB corrente.

Se una release include una migration non retrocompatibile:

- non fare rollback del solo Worker alla cieca;
- preferire una migration correttiva forward;
- oppure preparare un recovery coordinato codice + DB in ambiente isolato.

Le migration già applicate restano parte della storia e non vanno cancellate dal repository.

## Performance

Baseline FASE 9:

- chunk principale prima: circa 1.609 kB / 453 kB gzip;
- chunk principale dopo lazy-loading: circa 358 kB / 101 kB gzip;
- budget CI per chunk JavaScript: 500 kB;
- 10 foreign key mancanti di indice: corrette;
- 6 warning RLS initPlan: corretti;
- 12 sovrapposizioni di policy permissive: corrette.

Gli advisory `unused_index` restano informativi. Un indice non va rimosso finché non esiste evidenza che sia inutile nel carico reale.

## Baseline produzione al 9 ottobre 2026

Verifica Supabase:

- 39 tabelle `public`;
- 39/39 con RLS;
- circa 857 righe applicative;
- 2 utenti Auth;
- 2 identità Auth;
- 12 oggetti Storage;
- circa 6,68 MB Storage;
- bucket privati `solar-archive` e `quote-files`.

Questi numeri sono una fotografia, non vincoli permanenti.

## Controlli periodici

### Ogni giorno di utilizzo

- verificare eventuali incident issue automatici;
- eseguire backup secondo la policy aziendale.

### Dopo ogni deploy

```bash
bash scripts/polato-verify-production.sh
```

### Periodicamente

- rieseguire Supabase Security Advisor;
- rieseguire Supabase Performance Advisor;
- controllare i workflow GitHub;
- controllare i log Cloudflare;
- verificare almeno un backup con checksum;
- eseguire un restore test solo in ambiente isolato quando serve validare il disaster recovery.

## Stato delle 10 fasi di hardening

1. Supabase CLI e collegamento progetto — completata.
2. Variabili ambiente e secret management — completata.
3. Migration drift e security advisor — completata.
4. CI/CD e production readiness gate — completata.
5. Health, error reporting e observability — completata.
6. Backup e disaster recovery — completata.
7. RLS, access control e audit — completata.
8. Security headers e CORS — completata.
9. Performance e scalabilità — completata.
10. Runbook operativo e procedure di produzione — completata con questo documento.

## Chiusura release

Una release si considera completa quando:

- PR mergiata su `main`;
- workflow pertinenti verdi;
- migration applicate e versionate;
- `polato-update` eseguito;
- `scripts/polato-verify-production.sh` restituisce OK;
- nessun nuovo errore di sicurezza o TypeScript è stato introdotto;
- eventuali modifiche DB importanti sono coperte da backup.

## Aggiornamento del runbook

Questo documento va aggiornato se cambia uno dei seguenti elementi:

- URL di produzione;
- nome Worker;
- progetto Supabase;
- modello admin/operatori;
- strategia backup;
- procedura deploy;
- health endpoint;
- workflow CI;
- policy di sicurezza;
- strategia di rollback.
