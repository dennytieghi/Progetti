# Report test di design — Indice di Semplicità 94,1/100

Test esperienziale e visivo di UI/UX sull'app vera, piena dei dati dell'anno
simulato (classe TEST5B, 101 post), su viewport da telefono (390px).
Metodo e formula in `METODO-DESIGN.md`. Verdetto secondo le soglie: **≥85 =
pronto per il pilota senza riserve.**

## Punteggio

| Blocco | Punti | Note |
|---|---|---|
| A. Conformità misurata (DOM, 8 schermate) | 36,1/40 | tipografia 7,2 · bersagli 9,4 · contrasto 9,6 · sobrietà 10 |
| B. Percorsi vissuti (4 personas) | 40/40 | tutti dentro budget, zero esitazioni |
| C. Prova d'inclusione (checklist) | 18/20 | cede solo lo zoom 200% |
| **Totale** | **94,1/100** | |

## I percorsi (misurati, non stimati)

- **Giovanni (58, low-tech), dal link WhatsApp al voto: 2 tap** (budget 5).
  Opzioni alte 56px, "Il voto è anonimo" scritto in chiaro, dopo il voto
  "Hai votato. Ecco i risultati finora" con le barre. Il test che
  UX_PRINCIPLES chiedeva di fare con un parente vero è superato con margine.
- **Giovanni capisce una scadenza: 0 tap.** "Prossime scadenze" in testa alla
  bacheca dice cosa e quando ("Entro mercoledì 15 luglio") senza aprire nulla.
- **Denise pubblica una scadenza e la copia per WhatsApp: 7 tap** (budget 8,
  proxy dei 60 secondi della spec). Scelta tipo con esempi concreti, 3 campi
  con label, schermata "Fatto! Ora avvisa i genitori" col messaggio pronto.
- **Irene ritrova la quota gita tra 101 post: 2 tap.** Il filtro "Scadenza"
  riduce a 4 card e il titolo risponde da solo.

## Cosa sistemare (in ordine di importanza)

1. **Toggle "Mostra anche gli archiviati": alto 21px** (minimo 48). È l'unico
   accesso all'archivio — proprio il percorso che il primo stress test ha
   indicato come tallone d'Achille. Un genitore con dita grandi o vista
   stanca non lo becca. *(components/posts o pagina bacheca)*
2. **Pagina Richieste: il corpo del testo è a 15-16px** invece dei 17-18
   promessi (84 nodi su 91 sotto soglia): è la schermata peggiore in A1.
3. **Zoom testo 200%: la bacheca sviluppa scroll orizzontale** per la voce di
   menu "Scrivi al rappresentante" in `whitespace-nowrap`. Basta permettere
   il wrap sotto una certa larghezza.
4. Link-logo "ClasseHub" nell'header: bersaglio 32px (minore).
5. (Facoltativo) Il focus da tastiera oggi è l'anello di default del browser:
   funziona, ma un anello disegnato coerente col brand sarebbe più visibile.

## Limiti dichiarati del test

- Gli screenshot dell'estensione erano bloccati su localhost: la parte
  "visiva" è misurata dal DOM renderizzato (pixel, colori, geometrie), non da
  foto. I numeri non cambiano; manca solo la prova fotografica.
- Il viewport mobile è emulato con un iframe da 390px (le media query
  rispondono correttamente); il tocco è simulato via DOM contando i tap.
- J1 parte da utente già loggato, come da definizione della spec ("vota in
  2 tap"). Il primissimo accesso passa dal giro email/magic link: più lento
  per definizione, scelto consapevolmente in ADR e mitigato dal codice classe
  precompilato nel link.
- Il tap sul bottone "Copia per WhatsApp" dentro l'iframe di test ha aperto la
  richiesta di permesso appunti (artefatto dell'ambiente): da verificare una
  volta su telefono vero, dove il tocco diretto è un gesto utente valido.

## File

- `report-design.json` — punteggio completo e misure per schermata
- `misure/*.json` — dati grezzi dal DOM (8 schermate)
- `viaggi.json`, `inclusione.json` — esiti di percorsi e checklist
- Rifare il test: le misure si raccolgono con `raccogli-misure.js` nelle
  pagine e il punteggio con `node scripts/simulazione/design/punteggio-design.js`
