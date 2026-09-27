# Demo del 28 settembre 2026 — accesso amministrazione / FV

Questo ramo è una **preview dimostrativa**, non una produzione con permessi già collaudati.

## Cosa è pronto nella preview
- Home Polato R&D con due riquadri e icone distinte: Amministrazione (blu) e Impianti FV (rosso).
- Amministrazione: accesso con **le credenziali già esistenti** di `amministrazione@polatord.it`; nessun reset o cambio password.
- Nell'amministrazione, le dashboard FV, Automezzi e Assicurazioni continuano a utilizzare il progetto Supabase originale.
- Formazione personale: componente reale sviluppato (anagrafiche, oltre cento corsi organizzati per gruppo, multiselezione, corsi aggiunti manualmente, scadenze e note). **Se le tre tabelle training non esistono ancora, il componente presenta automaticamente una demo chiaramente etichettata, con due dipendenti inventati, senza possibilità di scrivere dati.** Se le tabelle esistono e le policy consentono l'accesso, usa i record reali.
- Impianti FV: il secondo riquadro precompila l'indirizzo previsto `impiantiFV@polatord.it`; in attesa che la casella e l'account Supabase vengano creati, il pulsante dedicato accede **solo a una demo sintetica isolata** con impianti fittizi. La demo non richiama le API Supabase e non permette di scrivere su dati aziendali. Non esiste né si deve creare una password fittizia che autentichi sul database.
- Recupero password: già implementato a livello UI e Supabase Auth. Serve comunque test live dei redirect URL e delle email (SMTP/provider) prima di dichiararlo funzionante.

## REQUISITO VINCOLANTE — accesso FV definitivo
La sezione **Impianti FV** dell'accesso operativo NON è una seconda dashboard semplificata, una copia dei componenti, né un insieme ridotto di funzioni: deve mostrare **lo stesso componente `Dashboard` già utilizzato nell'area Amministrazione**, le stesse viste `PlantEditor` e `PlantDetail`, gli stessi dati reali di `plants`, `panels`, `panel_photos`, roadmap e Storage nello stesso progetto Supabase Solar e gli stessi flussi già insegnati agli operai (lettura, ricerca, creazione/modifica impianti, scansione barcode, gestione pannelli, fotografie, checklist e PDF, salvataggio/cancellazione ove già consentita dalle policy operative approvate).

L'interfaccia FV, le etichette, i passaggi operativi e i comportamenti già utilizzati dal personale **non devono cambiare**: non duplicare la dashboard per ruolo, non introdurre una variante con layout o funzioni differenti. La separazione avviene esclusivamente tramite autorizzazioni, menu e rotte: l'operatore vede e usa la stessa dashboard FV dell'amministratore, ma **non vede né può leggere tramite API** automezzi, assicurazioni, formazione personale e ogni nuova sezione amministrativa. Tutti i vincoli devono essere verificati tramite RLS del database (non soltanto con il menu nascosto). L'amministratore mantiene tutte le dashboard.

**Lo schermo `FvDemo` fittizio ora incluso è soltanto un segnaposto temporaneo per la dimostrazione senza credenziali FV. Non rappresenta la dashboard operativa richiesta e NON deve essere rilasciato come accesso FV definitivo.** Prima della pubblicazione ufficiale della separazione, creare e testare l'account `impiantiFV@polatord.it` (quando la mailbox sarà pronta), instradarlo alla dashboard FV reale condivisa con l'amministrazione e collaudare punto per punto i flussi che gli operai già utilizzano, con account e browser separati.

L'home unica va pubblicata sullo **stesso dominio Cloudflare aziendale** una volta completati backup, configurazione e verifiche dei permessi; un URL demo distinto è soltanto un'opzione di test, non l'architettura prevista.

## Perché non abbiamo ancora due account reali
Il connettore Supabase attualmente associato NON autorizza l'operazione sul database originale `fjmrfxjvqsdrwjucgzla`. **Non installare utenti o tabelle su altri progetti.** Nessuna delle nuove migrazioni è stata applicata.

Il fallback **solo per demo** per l'attuale amministratore agisce esclusivamente quando la tabella `app_user_roles` non esiste (errore PostgreSQL `42P01` / PostgREST `PGRST205`). Non equivale a una protezione del backend: il database deve ancora essere ristretto dalle RLS preparate in PR #5. Non invitare operatori reali né registrare account FV fino a completamento del rollout.

## Distribuzione preview separata (consigliata)
Sul Mac, nella cartella locale del progetto, senza usare `polato-update` (che scarica `main`):

```bash
git status
git fetch origin
git switch -c demo/dual-portal-training-main-20260927 --track origin/demo/dual-portal-training-main-20260927
npm ci
npm run build
```

Se il ramo esiste già in locale:
```bash
git switch demo/dual-portal-training-main-20260927
git pull --ff-only
npm ci
npm run build
```

Usare `dist` per una **deployment di anteprima Cloudflare separata dall'URL pubblico attuale** per evitare che la demo sostituisca il servizio di produzione. Conservare in locale le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` già corrette; non caricarle su GitHub; **non utilizzare service_role nel frontend**. La demo FV non accede ai dati reali, ma l'area amministrativa autentica contro il database originale: divulgare il link soltanto alle persone autorizzate.

## Passaggio successivo alla demo
1. Verificare backup e policy esistenti su `vehicles` e `insurances`.
2. Applicare in ordine `20260926100000_app_admin_roles.sql`, assegnare `admin` all'utente esistente `amministrazione@polatord.it`, applicare `20260926110000_personnel_training.sql`, quindi `20260926120000_restrict_admin_dashboards.sql` (dopo aver verificato i vecchi accessi).
3. Creare/abilitare la casella `impiantiFV@polatord.it` e invitare questo utente nell'Auth del progetto originale; nessuna password nel codice o in chat.
4. Testare almeno due sessioni distinte, recupero password e negazione accesso API operator verso veicoli/assicurazioni/dipendenti.
5. Solo allora preparare e distribuire la release operativa su `main`. Tenere distinta questa preview dalla PR #5 finché le condizioni non sono soddisfatte.
