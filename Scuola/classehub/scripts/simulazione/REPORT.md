# Report stress test — un anno della 5B su ClasseHub + WhatsApp

Simulazione dell'anno scolastico 2025/26 (Emilia-Romagna, primaria, 23 famiglie
attive) generata da agenti AI su calendario e volumi calibrati con ricerca
reale. Dati caricati sul database Supabase vero (classe TEST5B), chat WhatsApp
ricostruita messaggio per messaggio. Metodo completo in `../SIMULAZIONE.md`.

## I numeri dell'anno

| Cosa | Quanto |
|---|---|
| Post in bacheca | 101 (13 sondaggi con 216 voti anonimi) |
| Richieste dei genitori via app | 40 |
| Messaggi WhatsApp | 4.510 |
| — di cui rumore (grazie/ok/buongiorno/auguri) | 3.728 (83%) |
| — di cui segnale | 782 |
| Iscrizioni gestite | 22 attive + 1 rifiutata + 1 pending |

Coerente con la ricerca: 35-55 comunicazioni ufficiali/anno, rumore 60-80%,
picchi a settembre, dicembre e maggio.

## Lo score di reperibilità (30 sondaggi ciechi)

Un agente "genitore" riceve un bisogno informativo a una data casuale e cerca
come una persona vera: lente di WhatsApp → link → app. Punteggio 0-100:
trovabilità in chat (30) + ponte chat→app (20) + posizione in bacheca quel
giorno (30) + correttezza della risposta (20, giudice separato).

**Risultato: 77,6/100 medio · 100% risposte corrette (30/30) · 0 arresi.**

| Componente | Media | Lettura |
|---|---|---|
| Trovabilità chat | 18,8/30 | La lente funziona ma serve spesso un secondo tentativo |
| Ponte chat→app | 19,4/20 | **Il punto di forza**: trovato il messaggio, il link risolve |
| Bacheca alla data | 21,1/30 | Le info vecchie affondano o sono archiviate |
| Correttezza | 18,3/20 | Nessuna risposta con la versione superata di un'info cambiata |

Trend mensile: 88,7 → 89 → 72 → 84,3 → 70 → 85,8 → 74,7 → 81 → **55,5 (mag)**
→ 66,5 (giu). Il calo di maggio-giugno non è caos: sono le domande "a distanza
di mesi" (borsone di gennaio chiesto a maggio, cassa di ottobre a marzo), dove
il post originale è ormai archiviato o in fondo alla bacheca. La risposta si
trova comunque — ma solo passando dalla ricerca chat, mai dalla bacheca.

## Le 3 trappole da informazione cambiata in corsa

Orario recita (10:30→9:00), partenza gita (7:45→7:30), menu mensa nuovo:
**tutte e tre superate**. Nessun cercatore ha riportato la versione vecchia.
Ha funzionato la mossa di Denise: archiviare subito il post superato e
pubblicarne uno nuovo che dichiara di sostituirlo.

## Cosa NON funziona (trovato dal test)

1. **Ricerca a più parole = zero risultati.** "piscina borsone", "festa fine
   anno", "regalo Leonardo Riccardo" → nulla; la parola singola funziona.
   È il limite della ricerca-sottostringa di WhatsApp, ma riguarda ClasseHub:
   quando l'app avrà una ricerca, non deve ereditare questo difetto.
2. **L'app non ha una ricerca in bacheca (V1).** Ogni recupero "a distanza di
   mesi" è passato dalla chat. Se il messaggio col link scompare (telefono
   nuovo, chat svuotata), l'info archiviata è di fatto irrecuperabile per un
   genitore normale: 101 post in un anno sono troppi da scorrere.
3. **Informazioni duplicate su più post** (sondaggio quota + post riepilogo):
   i cercatori atterrano su quello "sbagliato" e ricostruiscono. Il post di
   riepilogo dovrebbe linkare il sondaggio e viceversa.
4. **La chat resta ingestibile senza l'app**: 83% rumore, 65+ messaggi nei
   giorni di picco. Il valore di ClasseHub è confermato: in TUTTI i 30 casi
   la risposta finale stava in un post, mai ricostruita dai messaggi sparsi.

## Raccomandazione (una sola)

**V1 va bene così per il pilota**: il ponte chat→link→app regge un anno vero.
La prima feature di V1.1 dev'essere la **ricerca nella bacheca (inclusi gli
archiviati), tollerante alle parole multiple** — è l'unico punto in cui il
sistema oggi dipende dalla fragilità della chat.
Condizioni di revisione: se nel pilota reale i genitori chiedono "dov'era
quel post?" più di ~2 volte/mese in chat, la priorità è confermata; se non
succede mai, si rimanda.

## File

- `chat-whatsapp.html` — la chat dell'anno, sfogliabile, con filtro rumore
- `valutazione/report.json` — punteggi completi dei 30 sondaggi
- `statistiche-chat.json` — volumi mensili
- Bacheca vera: `pnpm dev` + `node scripts/dev-login.js denise.fabbri@simulazione.classehub.test` → `/c/TEST5B`
- Pulizia totale: `node scripts/simulazione/99-pulizia.js`
