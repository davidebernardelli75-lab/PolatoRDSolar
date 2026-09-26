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

## Privilegi
Le tre tabelle hanno RLS attiva, nessun permesso alla role anon;
gli utenti autenticati dell'app aziendale possono leggere/gestire i record,
come nell'attuale app monazienda. Se si vuole una segregazione tra
responsabile HR e altri dipendenti, aggiungere ruoli con policy specifiche
PRIMA di applicare la migrazione.

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
