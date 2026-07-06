# DECISIONS â€” ClasseHub

ADR (Architecture Decision Records). Formato breve: contesto, decisione, alternative scartate, condizioni di revisione.

## ADR-001 â€” Un solo codice classe + approvazione manuale del rappresentante
**Contesto**: come identificare le classi e prevenire iscrizioni di estranei senza gestire dati dei minori.
**Decisione**: `codice_classe` (6 char) unico per classe. Iscrizione a due tempi: richiesta in `pending`, approvazione manuale del rappresentante.
**Scartato**:
- doppio codice classe+figlio: introduceva overhead di distribuzione e accoppiamento strutturato al minore.
- solo codice classe senza approvazione: se il codice trapela (screenshot, foto della lavagna), estranei entrano.
- invito nominativo via email: rappresentante non ha tutti gli indirizzi.
**Trade-off accettato**: il rappresentante deve riconoscere i richiedenti. Aiutato da campo "nota" libero opzionale, non strutturato.
**Revisione se**: >20% delle richieste non riconosciute dal rappresentante â†’ valuta reintroduzione codice figlio come opt-in per classe.

## ADR-002 â€” WhatsApp come canale di broadcast, manuale
**Contesto**: come notificare i genitori?
**Decisione**: nessuna integrazione WhatsApp. Il rappresentante copia dall'app un testo pronto + link e lo incolla nel gruppo esistente.
**Scartato**: (a) WhatsApp Business API ufficiale (non supporta chat di gruppo), (b) provider terzi tipo Unipile (fragili, non-ufficiali, a pagamento, rischio ToS), (c) email digest (attrito 50-60enni con posta poco letta).
**Revisione se**: dopo pilota emerge che il tasto Copia non basta e i genitori si perdono â†’ valuta email digest come V1.1.

## ADR-003 â€” Sondaggio anonimo con hash
**Contesto**: come garantire anonimato ma prevenire doppio voto?
**Decisione**: `voter_hash = hash(user_id || poll_salt)`. Salt unico per sondaggio. Nessuna colonna con `user_id` diretto in `poll_votes`.
**Scartato**: (a) tracciare `user_id` in chiaro (rompe anonimato), (b) sondaggio senza login (impossibile prevenire doppio voto senza fingerprinting invasivo).
**Revisione se**: richiesta esplicita di sondaggi non-anonimi â†’ aggiungi flag `anonymous` sul poll, con default true.

## ADR-004 â€” Foto sÃ¬, PDF no in V1
**Contesto**: quali allegati permettere?
**Decisione**: solo foto (JPEG/PNG/HEIC) in V1. PDF rimandato.
**Motivo**: PDF richiede viewer, gestione dimensioni, security scan; foto Ã¨ ciÃ² che i genitori fanno di default (fotografano la circolare).
**Revisione se**: >30% degli avvisi ha foto di documenti testuali â†’ aggiungi PDF in V1.1.

## ADR-005 â€” Nessuna notifica push in V1
**Contesto**: come attirare l'attenzione dei genitori sui nuovi post?
**Decisione**: nessuna. Il canale Ã¨ WhatsApp gestito manualmente dal rappresentante.
**Scartato**: (a) push web (iOS richiede installazione PWA, attrito), (b) email push (in spam su Libero/Virgilio, lento).
**Revisione se**: rappresentante lamenta di dover copiare troppo â†’ V1.1 valuta email digest configurabile.

## ADR-006 â€” Codice di emergenza per recupero ruolo
**Contesto**: single point of failure sul rappresentante.
**Decisione**: alla creazione classe, genera codice 12 char, mostrato in PDF una volta, salvato hashed. Consente di trasferire il ruolo a un membro esistente.
**Scartato**: (a) reset via email (l'email potrebbe non essere piÃ¹ accessibile), (b) supporto manuale (non scalabile e Denny non vuole fare help desk).
**Revisione se**: >10% rappresentanti perde il codice â†’ aggiungi supporto manuale con verifica identitÃ .

## ADR-007 â€” Server Components di default, Client solo dove serve
**Contesto**: architettura Next.js.
**Decisione**: tutti i componenti server per default. Client solo per interazione (form, vote button, copy button).
**Motivo**: bundle JS minimo â†’ performance su vecchi telefoni Android dei genitori 50-60.
**Revisione se**: complessitÃ  stato client sale molto â†’ valuta Zustand.

## ADR-008 â€” Nessun ORM (Prisma/Drizzle), solo SDK Supabase + tipi generati
**Contesto**: layer di accesso dati.
**Decisione**: SDK Supabase + `supabase gen types typescript`. Query centralizzate in `lib/db/`.
**Motivo**: uno stack tool in meno, RLS fa giÃ  il grosso, schema semplice.
**Revisione se**: query complesse iniziano a proliferare â†’ introduci Drizzle in V2.

## ADR-009 â€” pnpm come package manager
**Contesto**: gestione dipendenze.
**Decisione**: pnpm.
**Motivo**: veloce, buon default Vercel, lockfile stabile.

## ADR-010 â€” Italiano only in V1, testi centralizzati
**Contesto**: internazionalizzazione.
**Decisione**: `lib/i18n/it.ts` esporta oggetto tipizzato. Nessun testo hardcoded.
**Motivo**: preparare EN in V2 senza refactor.

## ADR-011 â€” Membership pending come stato blocco totale
**Contesto**: cosa puÃ² fare il genitore tra richiesta e approvazione?
**Decisione**: nulla oltre a vedere la propria schermata di attesa. Nessuna lettura della bacheca in pending.
**Scartato**:
- accesso in sola lettura durante il pending: creerebbe confusione ("posso leggere ma non votare, perchÃ©?") e aprirebbe superficie di attacco se il codice trapela.
- attesa non bloccante con "grace period": complica il modello e non aggiunge valore reale.
**Revisione se**: feedback dai genitori "sto in attesa da giorni e non capisco a che punto sono" â†’ aggiungi indicatore di stato piÃ¹ esplicito, non liberalizzare l'accesso.

## ADR-012 â€” Nessuna gestione strutturata dei figli
**Contesto**: come parlare tra genitori di cose che riguardano i figli senza avere entitÃ  'figlio' nel sistema?
**Decisione**: sistema conosce solo genitori. Ogni riferimento a un figlio Ã¨ testo libero dentro un post (es. avviso: "portare il libro di storia in classe di Marco"). Nessuna colonna, indice, tag strutturato.
**Motivo**: minimo dato sui minori = minimo rischio GDPR + copy naturale.
**Trade-off**: impossibile filtrare/aggregare per figlio. Non serve in V1.
**Revisione se**: emerge un uso significativo per figlio (es. classi con doppio turno) â†’ valuta tag opzionali, non entitÃ .