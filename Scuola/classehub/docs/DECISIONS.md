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
## ADR-013 — Cassa a quote personali, movimenti intestati
**Contesto**: la cassa di classe è comune ma non tutti partecipano alle stesse spese: le quote in cassa non sono uguali per tutti.
**Decisione**: ogni movimento (`cash_movements`) ha quote intestate (`cash_shares`). Versamento = una quota del genitore che versa. Spesa = importo a testa × partecipanti scelti dal rappresentante. Saldo personale = versato − quote spesa. Il genitore vede tutti i movimenti della classe ma SOLO le proprie quote (RLS); il rappresentante vede tutto. La quota può andare in negativo ("da versare"), mai bloccata.
**Scartato**:
- fondo comune puro senza quote personali: non risponde al requisito "ogni genitore vede la sua quota rimasta".
- ripartizione pro-quota di ogni spesa su tutti i versanti: i contanti non hanno il nome sopra, e chi non partecipa a una gita non deve pagarla.
- registrazione contabile a doppia entrata: over-engineering per una cassa di classe.
**Revisione se**: i rappresentanti chiedono spese con importi diversi per partecipante (non a testa) → aggiungi importo per quota nella UI, lo schema lo supporta già.
**Aggiornamento (2026-07-12, feedback e2e)**: il rappresentante inserisce l'importo TOTALE della spesa (lo scontrino) e l'app lo divide pro-quota tra i partecipanti scelti; i centesimi di resto vanno uno a uno ai primi (`lib/cassa/dividi-spesa.ts`), così la somma delle quote è sempre il totale. Le quote possono quindi differire di 1 centesimo; la card mostra "× a testa" solo se sono tutte uguali.
**Superato in parte da ADR-017** (2026-07-11): vista genitore ristretta.

## ADR-014 — Stripe Connect Standard, conferma sincrona, produzione rimandata
**Contesto**: versamenti con carta senza che ClasseHub tocchi il denaro.
**Decisione**: Stripe Connect **Standard** — il conto è del rappresentante, i pagamenti (Checkout, direct charge) arrivano lì. La quota si registra al ritorno dal Checkout: il server rilegge la sessione da Stripe con la chiave segreta e registra solo se `paid`, in modo idempotente (unique su `stripe_session_id`). Niente webhook in V1: in locale non c'è URL pubblico. Senza `STRIPE_SECRET_KEY` la sezione carta sparisce e la cassa resta manuale.
**Scartato**:
- webhook `checkout.session.completed` in V1: richiede deploy pubblico o CLI Stripe; rimandato a quando l'app va su Vercel.
- Connect Express/Custom: ClasseHub diventerebbe responsabile di più oneri della piattaforma; Standard tiene il rapporto contrattuale tra rappresentante e Stripe.
- pagamenti sul conto Stripe di ClasseHub con giroconti: ClasseHub toccherebbe i soldi = rischio legale/fiscale inaccettabile.
**Trade-off accettato**: se il genitore paga e chiude il browser prima del ritorno, la quota non si registra finché non riapre il link — accettabile in test mode.
**Condizioni per andare in produzione (test → live)**: (1) app pubblicata su Vercel con webhook attivo, (2) entità legale per l'account piattaforma ClasseHub, (3) decisione su chi assorbe le commissioni (~1,5% + 0,25 € a transazione).
**Superato da ADR-016** (2026-07-11): codice Stripe rimosso.

## ADR-015 — Export in CSV, non in .xlsx
**Contesto**: rappresentante e genitori vogliono i dati della cassa "in Excel o Google Sheets".
**Decisione**: la route `cassa/esporta` genera un **CSV** su misura per l'Excel italiano (BOM UTF-8, separatore `;`, decimali con la virgola): doppio clic e si apre, e Google Fogli lo importa direttamente. Una riga per ogni quota, così i totali si ricostruiscono con una tabella pivot. Il contenuto lo decide l'RLS: stessa route per tutti, il rappresentante riceve tutto, il genitore solo le sue quote.
**Scartato**:
- libreria xlsx (exceljs/sheetjs): una dipendenza in più, superficie di bug in più, per un vantaggio estetico.
- integrazione Google Sheets API: OAuth e permessi Google per un file che si può semplicemente importare.
**Revisione se**: i rappresentanti chiedono formattazione (colori, totali pronti) → valuta exceljs in V2.

## ADR-016 — Pagamenti fuori dall'app con conferma del rappresentante (supera ADR-014)
**Contesto**: Stripe Connect richiedeva al rappresentante un onboarding KYC con documento d'identità e ~1,5% + 0,25 € di commissioni a transazione: sproporzionato per quote da 5-20 € e per l'utente tipo. I genitori usano già bonifico, Satispay e PayPal.
**Decisione**: il rappresentante pubblica le SUE coordinate (IBAN, paypal.me, numero Satispay) sulla classe; il genitore paga fuori dall'app e lo segnala (`cash_declarations`); la cassa si aggiorna solo quando il rappresentante conferma (nasce il movimento con `method`). ClasseHub non tocca mai denaro.
**Scartato**: Stripe (vedi sopra); registrazione diretta del genitore senza conferma (chiunque potrebbe gonfiare la cassa senza pagare).
**Trade-off accettato**: la conferma è manuale — il rappresentante deve controllare il proprio conto. È lo stesso lavoro che fa oggi col gruppo WhatsApp, ma con una lista ordinata invece di messaggi sparsi.
**Revisione se**: nel pilota i rappresentanti lamentano l'attesa delle conferme o le segnalazioni fantasma superano casi sporadici.

## ADR-018 — "L'ho visto" esplicito, mai sui sondaggi
**Contesto**: il rappresentante non sa chi ha letto un avviso; il genitore vuole togliere dal contatore ciò che ha già guardato.
**Decisione**: tabella `post_reads` (post_id, user_id, read_at). Il membro attivo spunta "L'ho visto" su avvisi, scadenze e materiale (toggle, dal dettaglio); sui sondaggi il visto è il VOTO. Contatori bacheca personali: "avvisi nuovi" = ultimi 7 giorni non visti da me; "sondaggi aperti" = aperti dove non ho votato. Il rappresentante vede SOLO il conteggio ("N su M genitori"), non i nomi (scelta di Denny 12/7: il numero basta e evita la gogna); per i sondaggi vede solo quanti voti, mai chi (il voto resta anonimo, ADR-003 non si tocca). La RLS permette comunque al rappresentante di leggere le righe: se servirà il sollecito mirato, è solo UI. La spunta di una scadenza NON la toglie da "scadenze aperte": aperta = non ancora scaduta.
**Scartato**: visto automatico all'apertura della pagina (falso positivo: aprire non è leggere, e il genitore non controlla cosa dichiara); de-anonimizzare i voti per mostrare chi manca (tutela dei genitori).
**Revisione se**: i rappresentanti chiedono un sollecito mirato a chi non ha visto → bottone WhatsApp con i nomi, senza cambiare il modello.

## ADR-017 — Il genitore vede solo la propria cassa (supera in parte ADR-013)
**Contesto**: il genitore vedeva tutti i movimenti della classe col totale; il numero "In cassa adesso" veniva scambiato per la propria disponibilità e i totali delle spese ("−14,00 €") per addebiti personali.
**Decisione**: RLS ristretta — il genitore vede solo i movimenti con una sua quota (spariscono anche i versamenti degli altri: chi versa e quanto è un fatto tra genitore e rappresentante). La sua pagina mostra "Quanto ti resta" col suo saldo; ogni riga mostra la SUA quota. Il totale della classe resta come unico controllo collettivo, in fondo e in piccolo, esposto dalla funzione SECURITY DEFINER `class_cash_total` (mai via admin, mai i singoli movimenti). Il rappresentante vede tutto come prima.
**Scartato**: totale via `supabaseAdmin` (aggirerebbe l'RLS creando un precedente); colonna "totale" mantenuta da trigger (fragile, inutile a questi volumi); lasciare visibili i versamenti altrui (reintroduce i confronti tra famiglie).
**Trade-off accettato**: il genitore non può più ricostruire la contabilità riga per riga; resta il totale aggregato. Accettato perché la fiducia nel rappresentante è già presupposta dal modello (è lui che tiene i contanti).
**Revisione se**: un genitore contesta un ammanco e serve una vista di dettaglio → valutare un riepilogo aggregato delle spese (causale + totale, senza i nomi dei partecipanti).
