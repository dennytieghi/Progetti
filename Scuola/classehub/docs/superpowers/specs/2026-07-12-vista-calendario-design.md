# Vista calendario della bacheca — design approvato (12/7/2026)

Decisioni prese con Denny in brainstorming. Vale per rappresentante e
genitori (ognuno vede gli stessi post che vede oggi in bacheca).

## Obiettivo

Accanto alla bacheca a elenco, una vista calendario che mostri a colpo
d'occhio cosa succede e quando, con la massima evidenza per scadenze e
post in evidenza. Semplice, senza fronzoli, stesso design (DESIGN.md +
scala font accessibile CLAUDE.md §6).

## Decisioni chiave

1. **Giorno di un post**: scadenze sul giorno di scadenza (`due_date`);
   avvisi, sondaggi e materiale sul giorno di pubblicazione
   (`created_at` convertito al fuso **Europe/Rome** — un post delle
   23:30 non slitta al giorno dopo). I sondaggi NON compaiono anche
   sulla chiusura.
2. **Viste**: solo **Settimana** e **Mese** (niente vista giorno).
   Default: mese. In entrambe, sotto la griglia c'è l'elenco del
   periodo; cliccando un giorno l'elenco si restringe a quel giorno.
3. **Ruoli**: tutti i membri attivi. Nessun dato nuovo esposto: solo i
   post già visibili in bacheca (non archiviati).
4. **Approccio A**: pagina server, stato nell'URL, click = link.
   Revisione se al test manuale il cambio giorno risulta lento →
   migrare la sola selezione giorno a un client component.

## Navigazione

- Nel pannello riepilogo ("Ciao …"), accanto al saluto: toggle a due
  segmenti **[Annunci | Calendario]** (pillola attiva indaco pieno,
  inattiva bordo hairline). "+ Pubblica" resta invariato (solo rep).
- Il pannello (saluto + toggle + barra statistiche cliccabili) diventa
  un componente server condiviso tra bacheca e calendario.

## Rotta e stato

- `app/(app)/c/[classCode]/calendario/page.tsx`, guardia
  `requireActiveMembership`.
- Query param: `vista=settimana|mese` (default mese), `data=YYYY-MM-DD`
  àncora del periodo (default oggi), `giorno=YYYY-MM-DD` selezionato
  (opzionale). Valori non validi → default, mai errori.
- Frecce ◀ ▶ (periodo prec/succ) e bottone "Oggi": tutti link.

## Griglia

- Mese: 7 colonne lun→dom, 5-6 righe; settimana: 1 riga di 7 celle più
  grandi. Celle ≥48px (touch target).
- Cella con post: sfondo **tinta del tipo dominante** (priorità:
  scadenza > avviso > sondaggio > materiale), numero del giorno in
  `*-tint-ink`; sotto il numero fino a 4 pallini (7px), uno per tipo
  presente.
- Cella con scadenza: in più **bordo pieno color scadenza**.
- Cella con post in evidenza: **pin rosso piccolo** nell'angolo (mai un
  secondo blocco di colore).
- Oggi: anello brand (ring 2px). Giorno selezionato: sfondo PIENO del
  colore dominante col numero bianco (avviso: numero scuro avviso-ink);
  se il giorno è vuoto, sfondo brand pieno.
- Giorni fuori mese (griglia mese): numeri sbiaditi (`ink-faint`),
  cliccabili.

## Elenco sotto la griglia

- Titolo del periodo ("Luglio 2026" / "Settimana 6–12 luglio" /
  "Martedì 9 luglio").
- Post con le **PostCard esistenti**, in due blocchi: prima scadenze e
  pinnati del periodo (in ordine di giorno), poi il resto (in ordine di
  giorno). Un post che è sia scadenza sia pinnato compare una volta
  sola, nel primo blocco.
- Giorno selezionato → solo quel giorno + link "Mostra tutta la
  settimana / tutto il mese".
- Periodo senza post → EmptyState gentile.

## Logica pura (lib/calendario/, con vitest)

- `giornoDelPost(post)`: YYYY-MM-DD secondo la regola 1.
- `raggruppaPerGiorno(posts)`: mappa giorno → post.
- `tipoDominante(tipi)`: per la priorità di colore.
- `grigliaMese(anno, mese)` e `settimanaDi(data)`: celle lun→dom.
- Test: fuso orario (23:30 italiane), priorità, bordi mese, settimana
  a cavallo di due mesi.

## Cosa NON fa (V1)

- Nessun export/ics, nessun trascinamento, nessuna creazione post dal
  calendario, nessuna vista giorno, nessun evento ricorrente.

## Test manuale

TEST_PLAN §17: toggle dalle due pagine, scadenza sul giorno di
scadenza, colore dominante rispettato, pin visibile, click giorno e
ritorno all'insieme, settimana a cavallo di mese, vista genitore
(Laura), URL con valori strani.
