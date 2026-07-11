# Design — Vista genitore ristretta della cassa

Data: 2026-07-11 (sera)
Stato: approvato da Denny
Modifica: ADR-013 ("il genitore vede tutti i movimenti della classe") → superato in parte da ADR-017

## Problema

Oggi il genitore vede TUTTI i movimenti della classe col loro importo totale,
e la card "In cassa adesso" in alto compete visivamente col suo numero
personale: viene scambiata per la sua disponibilità. Il genitore deve invece
capire al volo UNA cosa: quanto gli resta, e cosa lo riguarda.

## Decisioni (con Denny, 11/7/2026)

- Il genitore vede SOLO i movimenti che lo riguardano: i suoi versamenti e le
  sole spese in cui ha una quota. **Spariscono anche i versamenti degli altri
  genitori** (scelta esplicita: chi ha versato e quanto è un fatto tra il
  singolo genitore e il rappresentante; meno confronti sociali tra famiglie).
- Il totale della cassa resta come **unico controllo collettivo**, in fondo
  alla pagina, piccolo e grigio, con etichetta esplicita.
- Il totale arriva da una **funzione SQL SECURITY DEFINER**, non dai movimenti
  visibili (che non bastano più) e **mai** via `supabaseAdmin`.
- Lato rappresentante: nessun cambiamento.
- Numerazione: nuova migrazione **0007**, nuovo **ADR-017** (0006/ADR-016 sono
  già presi dai pagamenti semplici).

## Migrazione 0007 (`0007_vista_genitore_cassa.sql`)

1. **SELECT su `cash_movements`**: via la policy attuale
   (`cash_movements_select` con `is_active_member`); dentro:
   - `cash_movements_select_rep`: `is_representative(class_id)` — tutto;
   - `cash_movements_select_own`: esiste una riga in `cash_shares` con
     `movement_id = id` e `user_id = auth.uid()`.
2. **`class_cash_total(p_class_id uuid) returns int`** — SECURITY DEFINER:
   - guardia: se il chiamante non è membro ATTIVO della classe → eccezione
     (mai totali di classi altrui);
   - ritorna `sum(deposit) - sum(expense)` in centesimi, `0` se nessun
     movimento;
   - `set search_path = public` (lezione della migrazione 0002: mai
     search_path implicito nelle security definer);
   - `grant execute to authenticated` e `revoke from anon`.
3. `cash_shares`, `cash_declarations`, policy di insert/update/delete:
   invariate.

## Pagina cassa — genitore

- **Numero grande** centrato (`text-[44px]`): etichetta "Quanto ti resta",
  valore = `saldoPersonaleCents` (funzione pura esistente in
  `lib/cassa/saldi.ts`). Riga di contesto sotto:
  - positivo: "Hai ancora 46,50 € in cassa."
  - zero: "Hai usato tutto quello che avevi versato."
  - negativo: "Devi versare 3,50 €." (rosso). Il negativo resta permesso e
    non blocca nulla (come in ADR-013).
- **Rimossa** la card "In cassa adesso" dalla parte alta (solo genitore).
- **Lista movimenti**: la RLS la filtra già lato database. La card del
  movimento, per il genitore, mostra **la sua quota** con segno
  (es. "−3,50 €", non "−14,00 €"); sotto, in piccolo:
  "spesa di classe · 4 partecipanti" (conteggio = totale ÷ quota a testa,
  derivazione già usata oggi). Per i versamenti: il suo importo e il metodo.
- **In fondo**, sotto la lista, in `text-ink-soft` piccolo:
  "Totale della classe: 36,00 € — non è la tua quota."
  (valore dalla RPC `class_cash_total`).
- Testi in `lib/i18n/it.ts`, mai hardcoded.

## Pagina cassa — rappresentante

Invariata (saldi per membro, Da confermare, registra movimenti, filtri).
`saldoCassaCents` continua a calcolare il totale dai movimenti, che per lui
sono tutti.

## Effetti collaterali governati

- **Export CSV** (`cassa/esporta`): si appoggia alla RLS → il genitore
  esporterà solo le sue righe automaticamente. Da VERIFICARE nel test
  manuale, non dare per scontato.
- **Promemoria WhatsApp**: già senza importi personali; invariato (il link
  porta in cassa dove ognuno vede la sua situazione).
- **Dichiarazioni** (dichiara→conferma): invariate.
- `lib/db/queries.ts`: nuova `getClassCashTotal(classId)` che chiama la RPC
  via `supabaseServer()` (client dell'utente: la guardia sta nella funzione
  SQL).

## ADR-017 (in DECISIONS.md, supera in parte ADR-013)

**Trade-off accettato**: il genitore non vede più le spese a cui non ha
partecipato NÉ i versamenti degli altri, quindi non può ricostruire la
contabilità della classe riga per riga. Resta il totale aggregato come
controllo minimo. Accettato perché la fiducia nel rappresentante è già
presupposta dal modello (è lui che tiene i contanti).
**Revisione se**: un genitore contesta un ammanco e serve una vista di
dettaglio → valutare un riepilogo aggregato delle spese (causale + totale,
senza i nomi dei partecipanti).

## Test

- Unit (vitest): se la scelta della riga di contesto diventa una funzione
  pura (`testoSaldoPersonale(cents)`), testarne i tre casi + formattazione.
- Manuale su TEST5B:
  1. Laura vede "Quanto ti resta" col suo saldo, la lista SOLO dei suoi
     movimenti con le sue quote, e il totale classe in fondo.
  2. Giovanni (nessun movimento) vede lista vuota ma il totale in fondo sì.
  3. Il CSV di Laura contiene solo le sue righe; quello di Denise tutto.
  4. Denise vede la cassa identica a prima.
  5. Probe ostile: chiamata alla RPC con il class_id di un'altra classe →
     errore, nessun totale.

## Fuori scope

- Riepilogo aggregato delle spese per i genitori (solo se scatta la
  condizione di revisione dell'ADR-017).
- Qualsiasi cambiamento al lato rappresentante.
