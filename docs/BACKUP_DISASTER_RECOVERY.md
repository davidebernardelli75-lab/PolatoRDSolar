# Polato R&D — Backup e Disaster Recovery

## Stato attuale

- Progetto Supabase: `Polato R&D Gestionale Azienda`
- Project ref: `fjmrfxjvqsdrwjucgzla`
- Piano: Free
- Postgres: 17
- Backup off-site locale usato dall'azienda: `~/Desktop/Backup-Polato-Supabase`

Sul piano Free non si deve fare affidamento sui backup giornalieri ripristinabili del piano Pro. La procedura aziendale usa quindi export logici periodici e una copia separata dei file Supabase Storage.

## Cosa protegge il backup

Lo script `scripts/polato-backup.sh` crea una sottocartella datata senza sovrascrivere backup esistenti e salva:

1. ruoli database;
2. schema applicativo;
3. dump dati completo `data.sql`, che include anche i dati Auth e i metadati Storage;
4. dump Auth esplicito `auth_data.sql` per recovery selettivo;
5. dump metadati Storage esplicito `storage_metadata.sql`;
6. storico migration Supabase;
7. contenuto fisico dei bucket privati `solar-archive` e `quote-files`;
8. manifest del backup;
9. checksum SHA-256 verificati immediatamente.

I file di backup contengono dati aziendali e devono restare fuori dal repository Git.

## Auth e managed schemas

La CLI Supabase tratta in modo diverso schema e dati:

- il dump **schema** standard esclude gli schemi managed come `auth` e `storage`, perché un nuovo progetto Supabase li crea già;
- il dump **dati** può includere `auth` e `storage`;
- lo script crea inoltre due export espliciti: `auth_data.sql` e `storage_metadata.sql`.

Questo consente di preservare utenti, identità e dati Auth senza salvare connection string o password DB nel repository. Lo script verifica anche che il dump Auth contenga `auth.users` e che il dump Storage contenga `storage.buckets` e `storage.objects`.

In un nuovo progetto Supabase gli account possono essere recuperati dai dati Auth. Le API key/JWT del nuovo progetto saranno comunque diverse: le sessioni/token già emessi non vanno considerati riutilizzabili e gli utenti possono dover effettuare nuovamente il login.

## Esecuzione ordinaria

Dalla root del progetto:

```bash
./scripts/polato-backup.sh
```

Destinazione predefinita:

```text
~/Desktop/Backup-Polato-Supabase/YYYY-MM-DD_HH-MM-SS/
```

Si può cambiare la destinazione senza modificare lo script:

```bash
POLATO_BACKUP_ROOT="/percorso/backup" ./scripts/polato-backup.sh
```

## Frequenza consigliata

Per un gestionale operativo aziendale:

- almeno un backup al giorno nei giorni di utilizzo;
- un backup immediatamente prima di migrazioni o modifiche invasive;
- conservare più generazioni, non solo l'ultima;
- mantenere almeno una copia su un supporto o servizio fisicamente separato dal Mac.

Una cartella sul Desktop protegge da errori applicativi e cancellazioni nel database, ma non protegge da guasto/perdita del Mac se non è sincronizzata o copiata anche su un'altra destinazione.

## Verifica backup

Ogni backup contiene `checksums.sha256`.

Verifica manuale:

```bash
cd ~/Desktop/Backup-Polato-Supabase/<backup>
shasum -a 256 -c checksums.sha256
```

Tutte le righe devono terminare con `OK`.

## Disaster recovery

### Regola fondamentale

Non usare mai:

```bash
supabase db reset --linked
```

sul progetto di produzione.

### Ripristino completo

Un ripristino deve essere eseguito prima su un nuovo progetto Supabase o su un ambiente di test.

Sequenza:

1. creare un nuovo progetto Supabase;
2. configurare estensioni e impostazioni richieste;
3. ripristinare ruoli/schema/dati con `psql`;
4. ripristinare lo storico migration;
5. ricreare/caricare i bucket Storage;
6. copiare i file Storage nel nuovo progetto;
7. ripristinare i dati Auth usando il dump completo oppure `auth_data.sql`, evitando di caricarli due volte;
8. usare `storage_metadata.sql` solo quando necessario per il recovery dei metadati; i file fisici vanno comunque caricati tramite Storage API/CLI;
9. configurare nuove API key, Auth redirect, SMTP e altre impostazioni non contenute nel database;
10. verificare RLS, login amministrazione/operatori e conteggi dati;
11. solo dopo i test, spostare il traffico/app sul progetto recuperato.

### Storage

I backup database Supabase non contengono i file fisici di Storage. I file vengono salvati separatamente dallo script nelle directory:

```text
storage/solar-archive/
storage/quote-files/
```

In fase di recovery vanno ricaricati tramite Storage API/CLI nel progetto di destinazione.

## Obiettivi di recovery

Con backup giornaliero:

- RPO operativo: massimo circa 24 ore di dati;
- RTO: dipende dalla creazione del nuovo progetto, restore DB, Storage e verifica applicativa.

Per ridurre l'RPO sotto le 24 ore è necessario aumentare la frequenza di backup o passare a un piano/add-on con recovery più granulare.

## Verifiche prima di dichiarare un restore riuscito

- migration history coerente;
- tabelle pubbliche presenti;
- RLS attivo;
- account amministrazione/operatori verificati;
- impianti, cantieri, rapportini, preventivi, veicoli, assicurazioni, formazione e calendario presenti;
- file Storage scaricabili;
- endpoint Cloudflare `/api/health` operativo;
- build e production-readiness gate verdi.

## Dati di riferimento al 9 ottobre 2026

Inventario verificato in produzione:

- 39 tabelle `public`;
- circa 857 righe applicative;
- 2 utenti Auth;
- 2 identità Auth;
- 7 sessioni Auth;
- 9 refresh token Auth;
- 12 oggetti Storage;
- circa 6,7 MB di Storage;
- bucket privati: `solar-archive`, `quote-files`.

Questi valori servono come baseline indicativa per verificare un backup/restore; cambieranno con l'uso dell'app.
