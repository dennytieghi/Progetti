# PROJECT_SPEC â€” ClasseHub

## Problema
Le chat WhatsApp di classe (scuola primaria/secondaria) accumulano rumore: buongiorno, ok grazie, foto random, e le informazioni utili (scadenze, materiale, decisioni) si perdono. Il rappresentante di classe passa ore a ricordare, ripetere, e raccogliere risposte manualmente. I genitori 50-60 anni faticano a scorrere centinaia di messaggi.

## Soluzione (V1)
Web app multi-classe che sostituisce la chat come **contenitore delle informazioni strutturate** (avvisi, scadenze, sondaggi, materiale). WhatsApp resta il canale di notifica: il rappresentante copia dall'app un messaggio pronto + link e lo incolla nel gruppo esistente.

## Non-obiettivi (V1)
- Non Ã¨ una chat. Niente messaggistica libera.
- Non sostituisce il registro elettronico scolastico.
- Non gestisce insegnanti / comunicazioni ufficiali della scuola.
- Non ha app mobile nativa (Ã¨ PWA installabile).
- **Non ha entitÃ  "figlio" nel sistema.** Si parla solo tra genitori. Qualsiasi riferimento a bambini Ã¨ testo libero dentro un post.

## Personas

### Denise, 42, rappresentante di classe
- Usa WhatsApp fluidamente, PC per lavoro.
- Motivazione: smettere di essere "quella che rompe con i promemoria".
- Successo: crea un avviso in <60 secondi, lo diffonde nel gruppo con un tap.

### Giovanni, 58, papÃ  di Marco
- Usa WhatsApp e email. Fatica con app nuove.
- Motivazione: non perdersi le scadenze del figlio.
- Successo: apre il link ricevuto in WhatsApp, capisce cosa deve fare senza istruzioni, vota un sondaggio in 2 tap.

## User stories V1

**Come rappresentante**, voglio:
- creare una classe e ottenere un codice classe da distribuire.
- vedere la coda "Richieste di iscrizione" e approvare/rifiutare ogni richiesta.
- rimuovere un genitore giÃ  approvato (soft delete â†’ status='removed').
- pubblicare un avviso/scadenza/sondaggio/materiale in una form semplice.
- ottenere un messaggio WhatsApp pronto da copiare dopo ogni pubblicazione.
- vedere la coda "Richieste dai genitori" e trasformarne una in avviso/sondaggio con 2 click.
- fissare un post in cima.
- archiviare un post vecchio.
- chiudere un sondaggio anticipatamente.
- silenziare un genitore (solo lettura) senza rimuoverlo.
- trasferire il ruolo di rappresentante a un altro genitore giÃ  iscritto (usando codice di emergenza).

**Come genitore**, voglio:
- richiedere iscrizione a una classe con codice classe + nome + email + (opzionale) nota per il rappresentante.
- ricevere email quando la mia richiesta Ã¨ approvata o rifiutata.
- vedere la home con "Prossime scadenze" in alto e cronologia recente sotto.
- aprire un avviso e vedere titolo, testo, data, allegato foto se presente.
- votare un sondaggio (multipla, anonimo) e vedere i risultati subito dopo.
- inviare una richiesta al rappresentante in una zona dedicata (max 5/24h).

## Flussi chiave

### Onboarding rappresentante
1. Landing â†’ "Crea classe" â†’ email + nome classe + nome rappresentante.
2. Riceve magic link â†’ conferma â†’ vede dashboard.
3. Sistema genera `codice_classe` (6 char alfanumerico human-friendly, no ambigui: no 0/O, 1/I/l).
4. Sistema mostra PDF stampabile con: codice classe, istruzioni per genitori, **codice di emergenza** per recupero ruolo.

### Onboarding genitore
1. Landing â†’ "Entra in una classe" â†’ codice classe + nome + email + (opzionale) nota per il rappresentante.
2. Server Action valida codice classe.
3. `signInWithOtp` su Supabase Auth.
4. Callback magic link: upsert `profiles`, crea `memberships` con `status='pending'` e `note_for_rep` valorizzata.
5. Schermata "In attesa di approvazione. Riceverai un'email quando il rappresentante ti fa entrare."
6. Se il genitore riclicca il link a bacheca prima dell'approvazione: stessa schermata di attesa.
7. Rappresentante vede in "Impostazioni â†’ Richieste di iscrizione" la coda pending con: nome, email, nota. Approva o Rifiuta.
8. All'approvazione: `status='active'`, `decided_at=now()`, `decided_by=uid`, `note_for_rep=null`. Email di conferma al genitore con link diretto alla bacheca.
9. Al rifiuto: `status='rejected'`, email di conferma al genitore con motivazione libera del rappresentante.

**Copy della schermata attesa**: include "L'approvazione puÃ² richiedere qualche giorno. Se dopo 5 giorni non hai avuto risposta, chiedi al rappresentante." e "Controlla anche in spam/posta indesiderata quando arriverÃ  l'email."

**Copy della coda approvazioni** (rappresentante): banner "Se non riconosci il richiedente, chiedi in chat prima di approvare. In caso di dubbio, rifiuta e chiedi di riprovare."

### Pubblicazione avviso
1. Rappresentante: "+ Nuovo" â†’ sceglie tipo (Avviso / Scadenza / Sondaggio / Materiale) â†’ form specifico â†’ Pubblica.
2. Dopo pubblicazione: schermata "Fatto! Ora avvisa i genitori:" con box testo pre-formattato + pulsante "ðŸ“‹ Copia per WhatsApp".

Esempio testo generato per una Scadenza:
```
â° SCADENZA â€” Consegna moduli iscrizione mensa
ðŸ“… Entro venerdÃ¬ 12 dicembre
Dettagli e come procedere:
ðŸ‘‰ classehub.app/c/A7K3M9/p/x8k2
```

### Votazione sondaggio
1. Genitore riceve link WhatsApp â†’ click â†’ apre pagina sondaggio.
2. Se non loggato: pagina di login veloce (codice classe pre-compilato dal link).
3. Vede domanda + opzioni checkbox + scadenza.
4. "Vota" â†’ risultati con barre.

## Metriche di successo (per il pilota su 1 classe reale)
- â‰¥80% dei genitori si iscrive entro 7 giorni dall'invio del codice.
- â‰¥70% partecipa ad almeno un sondaggio nel primo mese.
- Rappresentante dichiara "riduzione tempo di gestione" â‰¥30% (survey a 4 settimane).

## Fuori scope V1 (backlog esplicito)
- Notifiche push web.
- Email digest automatico.
- Allegati PDF.
- Calendario esportabile (.ics).
- Import contatti da vecchie chat.
- App mobile nativa.
- Traduzione EN/altre lingue.
- Analytics per il rappresentante.
- Ruolo insegnante.
- Multi-figlio strutturato (i "gemelli" restano un solo genitore = una sola iscrizione).