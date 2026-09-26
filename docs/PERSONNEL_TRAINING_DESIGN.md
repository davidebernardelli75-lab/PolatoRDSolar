# Formazione personale — Polato R&D Solar

## Scopo
Anagrafica essenziale per dipendente, catalogo a selezione multipla, corsi personalizzati
condivisi e registrazione individuale di data del corso, eventuale scadenza, ente
formatore e note. Menu principale: «Formazione personale» (icona cappello).
Dashboard: dipendenti attivi, corsi assegnati, corsi entro 60 giorni dalla
scadenza, corsi scaduti. Le voci selezionate appaiono come «Corso A + Corso B».

## Confini normativi da rispettare
Non esiste un elenco di corsi universalmente obbligatori per ogni elettricista o
installatore FV. La necessità dipende da DVR, ruolo, ATECO, incarichi,
macchinari realmente usati e regione. Il catalogo raggruppa corsi possibili,
non emette attestati o qualifiche. Le scadenze sono inserite dall'utente in base
agli attestati e alle regole applicabili, NON generate automaticamente.

La formazione CEI 11-27 non assegna da sola PES/PAV o idoneità PEI: queste
richiedono valutazione e attribuzione formale del datore di lavoro.
Distinguere formazione, addestramento, nomina/abilitazione e aggiornamento.

## Modello dati (migrazione separata, NON applicata automaticamente)
- employees: nome, cognome, mansione, data assunzione facoltativa, stato attivo.
- employee_courses: record associato al dipendente e al nome del corso,
  data completamento, scadenza manuale, ente formatore, note.
- training_custom_courses: titoli aggiunti manualmente (condivisi
  fra gli utenti autenticati).
Non si raccolgono codice fiscale, data di nascita o dati sanitari.
Il pulsante disattiva dipendente, non elimina anagrafiche.

## Accessi e pubblicazione (ruoli gestiti lato database)
**Personale operativo:** tutti gli utenti già autenticati nell'app possono accedere
agli impianti FV e alle relative funzioni già autorizzate dalle policy esistenti.
Non si modifica la RLS di plants, panels, panel_photos, roadmap o Storage.

**Amministrazione:** solo gli utenti cui è stata attribuita esplicitamente
la voce `admin` in `public.app_user_roles` possono leggere o modificare
Parco Automezzi, Assicurazioni e Formazione personale.
Senza un ruolo esplicito si è considerati `operator`.
Il menu è nascosto e App blocca il routing, ma soprattutto il DB applica
RLS a tutte le operazioni SELECT/INSERT/UPDATE/DELETE.
I dati del personale, inclusi nomi e scadenze degli attestati, non sono
accessibili agli altri utenti autenticati nemmeno interrogando le API.
Non affidarsi a nascondere i pulsanti come unica protezione.

### Rollout SICURO, obbligatorio prima di unire/dispiegare la PR
Usare solo il progetto originale `fjmrfxjvqsdrwjucgzla`, dopo backup:
1. Prima controllare le policy esistenti di `public.vehicles` e
   `public.insurances` e verificare che nessuna integrazione legittima
   usi quelle tabelle con account non amministrativi. Esempio di
   interrogazione di sola lettura:

   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename IN ('vehicles', 'insurances');
   ```

2. Eseguire `supabase/migrations/20260926100000_app_admin_roles.sql`:
   crea i ruoli e la funzione `polato_internal.is_polato_admin()`,
   ma non modifica ancora l'accesso alle dashboard esistenti.

3. **Assegnare il ruolo PRIMA di attivare la restrizione.**
   Scegliere un account già esistente in Supabase Authentication -> Users,
   verificare che l'email sia corretta, poi sostituire il segnaposto seguente
   nello SQL Editor (NON inserire password nel codice o in chat):

   ```sql
   SELECT id, email FROM auth.users
   WHERE lower(email) = lower('EMAIL_AMMINISTRATORE_DA_SOSTITUIRE');

   INSERT INTO public.app_user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users
   WHERE lower(email) = lower('EMAIL_AMMINISTRATORE_DA_SOSTITUIRE')
   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

   SELECT u.email, r.role FROM public.app_user_roles r
   JOIN auth.users u ON u.id = r.user_id WHERE r.role = 'admin';
   ```
   La query finale deve mostrare almeno un amministratore CORRETTO.
   Gli operatori non richiedono un record: l'assenza di ruolo equivale a operator.

4. Eseguire `supabase/migrations/20260926110000_personnel_training.sql`:
   crea le tabelle corsi con RLS amministrativa fin dalla prima apertura.
5. Subito prima della pubblicazione, eseguire
   `supabase/migrations/20260926120000_restrict_admin_dashboards.sql`.
   È transazionale e si interrompe se non esiste un admin o mancano le
   tabelle precedenti. Sostituisce intenzionalmente eventuali vecchie policy
   troppo permissive su vehicles/insurances. Prima verificarle come al punto 1.
6. Dopo la revisione e i test, unire la PR, eseguire `polato-update` e
   distribuire la nuova build. Il codice non contiene chiavi service_role.

### Test di accettazione obbligatori (due account diversi)
- Utente operativo: può registrare/modificare un impianto FV e gestire i
  dati degli impianti autorizzati. Non vede le tre dashboard amministrative.
  Una richiesta API con il suo JWT a `vehicles`, `insurances` e
  `employees` non deve restituire righe private, né poterle modificare.
- Amministratore: accede a tutte e quattro le sezioni, vede i dati preesistenti
  (7 automezzi e 10 assicurazioni alla verifica del 26 settembre) e può
  creare/modificare dipendenti e corsi.
- Se la verifica del ruolo fallisce, l'interfaccia resta utilizzabile per gli
  impianti FV ma non mostra le dashboard amministrative. Una sessione nuova
  deve riflettere il ruolo assegnato.
- Gli account Supabase che usano `service_role` bypassano RLS: non esporre mai
  tale chiave nel browser o nelle variabili `VITE_*`.

Rischi residui: se gli utenti di campo possono aprire direttamente lo Storage
originale e questo contiene documenti amministrativi, occorre separare
anche i relativi bucket/policy. Qui NON cambiamo la RLS degli impianti e
delle fotografie per non interrompere le attività FV.

## Account e recupero password
- **Amministrazione:** `amministrazione@polatord.it` è l'account già esistente e
  va verificato in Supabase Auth prima di assegnargli `admin`.
- **Impianti FV:** nome account condiviso concordato `impiantiFV@polatord.it`
  (Supabase normalizza la ricerca senza distinzione maiuscole/minuscole).
  È un *account ancora da creare*: non assumere che la mailbox esista,
  che sia configurata o che riceva già email.
- Gli utenti che condividono l'account FV non hanno un audit nominativo:
  ogni loro operazione apparirà associata all'identità condivisa.
- Nessuna password va hardcoded nel repository, nelle migration, in chat,
  in `.env` o nei log. Password iniziali impostate tramite invito privato
  o reset verso una casella realmente presidiata dall'azienda.
- Il recupero password è già presente nella schermata di login; questa
  branch aggiunge il form dedicato alla nuova password dopo l'evento
  Supabase `PASSWORD_RECOVERY`, con conferma, controllo lunghezza,
  errori espliciti e nuovo accesso dopo il cambio.
- **Configurazione manuale da verificare in Supabase Auth del progetto
  originale:** Site URL = URL pubblico Cloudflare effettivamente usato
  dall'azienda; Redirect URLs includono
  `https://<dominio-cloudflare-attivo>/?auth=recovery` ed eventuale
  dominio personalizzato realmente utilizzato; servizio email/SMTP,
  template di recupero e ricezione effettiva su entrambe le caselle.
  Non pubblicare o dichiarare funzionante il recupero senza test reale
  end-to-end via email (anche su smartphone) per entrambi gli account.
- Le password dell'account FV condiviso possono essere ripristinate
  **solo da chi controlla la casella impiantiFV@polatord.it**. Non tutti
  gli operativi dovrebbero accedere a quella casella: l'amministrazione
  conserva il controllo del reset e distribuisce la nuova password con
  un canale aziendale sicuro. Un reset invalida la password conosciuta
  dagli altri utilizzatori e richiede coordinamento.
- Non abilitare registrazione pubblica di nuovi account: la creazione
  dell'utente FV va svolta dall'amministratore Supabase tramite Auth
  Users / invito, evitando di esporre nel frontend chiavi privilegiate.
- Verificare con due browser distinti: reset admin, reset FV, link
  scaduto/riutilizzato, redirect autorizzato, login successivo e
  impossibilità per l'account FV di consultare direttamente le
  tabelle amministrative via API.

## Riferimenti per selezione catalogo (verificati 26 settembre 2026)
- Accordo Stato-Regioni formazione sicurezza 17 aprile 2025 (G.U. 119/2025):
  https://www.gazzettaufficiale.it/atto/vediMenuHTML?atto.codiceRedazionale=25A03080&atto.dataPubblicazioneGazzetta=2025-05-24&tipoSerie=serie_generale&tipoVigenza=originario
- FAQ Ministero del Lavoro:
  https://www.lavoro.gov.it/temi-e-priorita/salute-e-sicurezza/focus/pagine/accordo-stato-regioni-del-17042025-materia-di-formazione
- CEI 11-27:2025, lavori elettrici e percorsi PES/PAV/PEI:
  https://ceimagazine.ceinorme.it/lavori-su-impianti-elettrici-la-nuova-edizione-della-norma-cei-11-27-e-i-corsi-di-aggiornamento-per-la-sicurezza/
- INAIL valutazione rischio elettrico:
  https://www.inail.it/portale/prevenzione-e-sicurezza/it/come-fare-per/conoscere-il-rischio/rischio-elettrico/valutazione-e-gestione-del-rischio.html
- DM 2 settembre 2021 addetti antincendio:
  https://www.gazzettaufficiale.it/eli/id/2021/10/04/21A05748/sg
- CEI 64-8 (impianti BT):
  https://mycorsi.ceinorme.it/corso/558
- CEI 82-25 (progettazione impianti FV):
  https://mycorsi.ceinorme.it/corso/592
- Regione Veneto, circolare aggiornamento FER (verificare sempre versione e
  regione applicabile):
  https://spazio-operatori.regione.veneto.it/documents/365607/552393/Circolare%2BEsplicativa%2BAggiornamenti%2B19-11-19.pdf/9e33b67c-cf0c-8fbe-0290-5a02721f8db1

## Evoluzioni possibili
- Allegare certificati in uno Storage bucket privato con policy per ruoli.
- Storico rinnovi: più edizioni del medesimo corso, mantenendo gli attestati passati.
- Alert email pianificati, export PDF/CSV, matrice mansione-corsi validata dal RSPP.
