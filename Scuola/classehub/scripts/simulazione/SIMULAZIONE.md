# Simulazione stress: un anno scolastico sulla 5B

Obiettivo: verificare se **bacheca ClasseHub + gruppo WhatsApp** reggono un
anno intero (settembre 2025 → giugno 2026) in termini di leggibilità,
reperibilità delle informazioni e usabilità. Volumi calibrati su ricerca
reale (`dati/ricerca-pattern.md`).

## Architettura

```
dati/personas.json        22 genitori + rappresentante + 2 casi limite, con parametri comportamento
dati/calendario.json      eventi dell'anno, compleanni, volumi mensili target
dati/mesi/2025-09.json …  contenuti generati dagli agenti AI, un file per mese
dati/registro-classe.json mapping persona → user_id Supabase (creato dal passo 1)
dati/registro-post.json   mapping rif post → slug/id reali (creato dal passo 2)
uscite/chat-whatsapp.jsonl  la chat dell'anno completa (significativi + rumore)
uscite/chat-whatsapp.html   visualizzatore stile WhatsApp
uscite/valutazione/…        sondaggi del valutatore + report KPI
```

Pipeline (ogni passo è uno script Node, stesso stile di `scripts/dev-login.js`):

1. `01-crea-classe.js` — crea su Supabase la classe TEST5B, il rappresentante
   e i genitori (utenti auth veri, email di dominio riservato
   `@simulazione.classehub.test`, membership retrodatate).
2. `02-carica-anno.js` — inserisce post, sondaggi, voti (hash anonimo identico
   a `cast_poll_vote`), richieste; tutto retrodatato; registra gli slug reali.
3. `03-chat-whatsapp.js` — fonde i messaggi significativi scritti dagli agenti
   con il rumore generato da template per persona (ok/grazie, buongiorno,
   auguri, catene) fino ai volumi target; i messaggi "condividi post" usano il
   VERO formato di `lib/whatsapp/format-message.ts` con i link reali.
4. `04-valuta.js` + agenti valutatori — i sondaggi di reperibilità (sotto).
5. `99-pulizia.js` — cancella classe (a cascata) e utenti finti. Riconosce i
   finti SOLO dal dominio email riservato: account veri intoccabili.

Casualità con seme (`config.SEME`): stessa configurazione → stesso anno.

## Contenuti generati dagli agenti (formato mese)

Ogni `dati/mesi/AAAA-MM.json`:

```jsonc
{
  "mese": "2025-09",
  "post": [{
    "rif": "p-2025-09-01",            // id logico, lo slug vero arriva al caricamento
    "tipo": "notice|deadline|poll|material",
    "titolo": "…", "corpo": "…",
    "creatoIl": "2025-09-16T13:05:00+02:00",
    "dueDate": null,                   // solo deadline
    "pinned": false,
    "archiviatoIl": null,              // se il rappresentante lo archivia più avanti
    "condivisoInChat": true,           // Denise incolla il messaggio pronto nel gruppo
    "sondaggio": {                     // solo poll
      "chiudeIl": "…",
      "opzioni": ["…", "…"],
      "voti": [{ "persona": "laura.bianchi", "opzioni": [0] }]
    }
  }],
  "richieste": [{ "persona": "…", "testo": "…", "creatoIl": "…",
                  "esito": "open|handled|archived", "convertitaIn": "p-… | null" }],
  "chat": [{ "persona": "…", "quando": "…", "testo": "…",
             "rifPost": "p-… | null" }],   // se rifPost e persona=rappresentante → messaggio-condivisione
  "fatti": [{ "id": "f-gita-costo", "domanda": "Quanto costa la gita e entro quando si paga?",
              "risposta": "28€ entro il 24 aprile", "rifPost": "p-…",
              "pubblicatoIl": "…", "sostituisce": null }]   // registro ground-truth per il valutatore
}
```

## Algoritmo di score del valutatore (KPI)

Un agente "genitore che cerca" riceve un bisogno informativo pescato dal
registro dei fatti (es. "quanto costa la gita?") a una data casuale D
successiva alla pubblicazione, e prova a rispondere **come farebbe una persona
vera**: cerca nella chat WhatsApp, se trova un link apre l'app, altrimenti
scorre. ~30 sondaggi distribuiti sull'anno (3 per mese).

Score 0-100 per sondaggio, quattro componenti:

1. **Trovabilità in chat (0-30)** — si simula la ricerca per parole chiave di
   WhatsApp sui messaggi fino alla data D. Conta la posizione del primo
   risultato davvero pertinente tra i match (1º = 30, 2º = 24, 3º = 18,
   oltre = penalità crescente). Se le parole chiave non trovano nulla si
   simula lo scroll: punteggio che decade con la profondità
   (`30 × max(0, 1 − messaggi_da_scorrere / 300) × 0.5`).
2. **Ponte chat → app (0-20)** — il messaggio pertinente contiene il link
   ClasseHub al post giusto? 20. Link a un post vecchio/sbagliato? 8.
   L'informazione sta solo nel testo della chat, sparsa? 0-6.
3. **Trovabilità in bacheca (0-30)** — stato della bacheca alla data D
   (ricostruito da post, pin e archiviazioni): post fissato in alto = 30;
   tra i primi 5 = 26; posizione 6-15 = 18; più sotto = decrescente;
   archiviato = 6. Se è una scadenza futura mostrata in "Prossime scadenze",
   si sale comunque a 30: è il percorso che l'app promette.
4. **Correttezza (0-20)** — un secondo agente giudice (che conosce la verità
   dal registro fatti) valuta la risposta raccolta: completa e attuale = 20,
   parziale = 10, superata da un aggiornamento che il cercatore non ha
   visto = 0-5. Questo misura il danno delle informazioni cambiate in corsa.

KPI aggregati nel report:

- **Score medio per mese** (trend: la reperibilità degrada col riempirsi di
  chat e bacheca?)
- **Confronto solo-chat vs chat+app**: stesso bisogno risolto ignorando l'app
  (componenti 1+4 riscalate) contro percorso completo → quantifica il valore
  aggiunto di ClasseHub.
- **Tasso di risposta corretta** (% sondaggi con correttezza ≥ 10).
- **Casi peggiori** documentati (dove e perché la ricerca fallisce).

Anti-imbroglio: l'agente cercatore riceve SOLO la chat fino alla data D e
l'accesso ai contenuti dell'app; non vede il registro fatti né i file dei
mesi. Il giudice della correttezza è un agente separato.

## Tentativi di falsificazione (metodo CLAUDE.md §1)

1. *"Gli agenti generano tutto, anche il rumore"* → rotto: costi enormi e il
   rumore LLM diventa troppo vario. Il rumore vero è ripetitivo per natura:
   template deterministici per persona sono più realistici e gratis.
2. *"Il valutatore è lo stesso modello che ha scritto i contenuti: può barare"*
   → mitigato: cercatore cieco (solo chat+app, niente ground truth), giudice
   separato, componenti 1 e 3 calcolate meccanicamente dallo script, non dal
   modello.
3. *"Retrodatare i post falsa il test"* → verificato: la bacheca ordina per
   `pinned desc, created_at desc` e le scadenze per `due_date`; l'ordine che
   vede l'utente dipende solo da queste colonne, quindi i dati retrodatati
   sono indistinguibili da un anno vissuto davvero.
