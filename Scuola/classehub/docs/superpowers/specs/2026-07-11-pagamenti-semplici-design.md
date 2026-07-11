# Design — Pagamenti semplici: coordinate del rappresentante + dichiara → conferma

Data: 2026-07-11
Stato: approvato da Denny (sessione di brainstorming)
Sostituisce: l'integrazione Stripe di ADR-014 (mai andata oltre il test mode; codice rimosso)

## Problema

I genitori devono versare quote piccole (5–20 €) nella cassa di classe. Stripe
richiedeva al rappresentante un onboarding con documento d'identità (KYC) e
commissioni ~1,5% + 0,25 € a transazione: sproporzionato per l'utente tipo
(genitore 50-60 anni, poca confidenza tecnica) e per gli importi in gioco.
I genitori usano già bonifico, Satispay e PayPal nei gruppi classe reali.
L'app deve togliere l'attrito, non aggiungere un intermediario.

## Soluzione in due pezzi

1. **Coordinate di pagamento della classe**: il rappresentante le inserisce
   una volta; il genitore le trova in cassa (copia/apri link) e il
   rappresentante le condivide via WhatsApp col promemoria esistente.
2. **Versamenti "dichiara → conferma"**: il genitore dichiara in app di aver
   pagato (importo + metodo); la cassa si aggiorna SOLO quando il
   rappresentante, visti i soldi sul suo conto, conferma. Sul movimento resta
   registrato il metodo di pagamento, visibile nello storico e nell'export CSV.

## Schema dati (migrazione 0006)

### classes — coordinate di pagamento (tutte opzionali)

| colonna | tipo | note |
|---|---|---|
| `payment_iban` | text | IBAN del rappresentante |
| `payment_iban_holder` | text | intestatario del conto |
| `payment_paypal` | text | link `https://paypal.me/...` |
| `payment_satispay` | text | numero di telefono associato a Satispay |

Nel riquadro "Come pagare" compare solo ciò che è compilato. Se non è
compilato nulla, il riquadro non compare e la cassa funziona come oggi.

### cash_movements — metodo di pagamento

- Nuova colonna `method text not null check (method in
  ('contanti','bonifico','satispay','paypal','altro'))`, default `'contanti'`
  per i movimenti esistenti (il default si può rimuovere dopo il backfill).
- **Rimozione Stripe**: via `stripe_session_id` e `source`
  (e `classes.stripe_account_id`); le policy RLS che citavano
  `source = 'manual'` vengono ricreate senza quella condizione.

### cash_declarations — nuova tabella

| colonna | tipo | note |
|---|---|---|
| `id` | uuid pk | |
| `class_id` | uuid fk classes on delete cascade | |
| `user_id` | uuid fk auth.users | il genitore che dichiara |
| `amount_cents` | int > 0 | |
| `method` | text | stesso check di `cash_movements.method`; `contanti` è ammesso (copre la consegna a mano già avvenuta che il genitore vuole far registrare) |
| `note` | text nullable | es. "per la gita" |
| `status` | text | `pending` / `confirmed` / `rejected`, default `pending` |
| `movement_id` | uuid nullable fk cash_movements on delete set null | compilato alla conferma |
| `created_at` | timestamptz default now() | |
| `decided_at` | timestamptz nullable | quando il rappresentante decide |

Nessuna cancellazione: le dichiarazioni rifiutate restano come traccia.

### RLS (tutte le tabelle già con RLS attiva; qui le nuove policy)

- `cash_declarations` select: il genitore vede solo le proprie
  (`user_id = auth.uid()`); il rappresentante tutte quelle della sua classe.
- `cash_declarations` insert: solo membro **attivo** della classe, solo a
  proprio nome, solo con `status = 'pending'`.
- `cash_declarations` update: solo il rappresentante della classe (decisione).
- Nessuna policy di delete.

## Flussi

### Genitore

1. Entra in cassa e vede il riquadro **"Come pagare"**: IBAN + intestatario
   con bottone **Copia**, link PayPal cliccabile, numero Satispay con Copia.
2. Paga fuori dall'app col metodo che preferisce.
3. Preme **"Ho versato"** → form: importo (1–500 €), metodo, nota opzionale.
4. Vede la dichiarazione "in attesa" sopra il suo storico, con il messaggio:
   *"Il tuo versamento sarà visibile in cassa appena il rappresentante lo
   conferma."* Se rifiutata, vede lo stato "rifiutata".

Guardie anti-pasticci: massimo **5 dichiarazioni in attesa** per genitore per
classe; Zod valida importo e metodo; rate limit come le altre azioni di
scrittura.

### Rappresentante

1. **Impostazioni cassa**: compila le coordinate. Validazione: IBAN italiano
   plausibile (27 caratteri, inizia per IT, checksum non richiesto in V1),
   PayPal solo link `paypal.me`, Satispay numero di telefono.
2. In cima alla cassa vede **"Da confermare (N)"** con le dichiarazioni in
   attesa: genitore, importo, metodo, nota, data.
3. **Conferma**: form precompilato (importo, metodo, causale = nota o
   "Versamento") e correggibile → il server crea il movimento + la quota
   intestata al genitore e marca la dichiarazione `confirmed` con
   `movement_id`. Da qui i saldi si aggiornano.
4. **Rifiuta**: la dichiarazione passa a `rejected`; nessun movimento.
5. Continua a registrare versamenti diretti (es. contanti alla consegna) come
   oggi, ora scegliendo anche il metodo.
6. Il **promemoria WhatsApp** esistente include le coordinate di pagamento
   oltre al link alla cassa.

### Server Actions (in `app/(app)/c/[classCode]/cassa/actions.ts`)

- `salvaCoordinatePagamentoAction` — solo rappresentante; Zod su ogni campo.
- `dichiaraVersamentoAction` — solo membro attivo; crea la dichiarazione.
- `confermaDichiarazioneAction` — solo rappresentante; verifica che la
  dichiarazione appartenga alla sua classe e sia `pending`; crea movimento +
  quota + aggiorna stato. I tre passi non sono atomici (stesso pattern di
  `recordCashDeposit` esistente): se un passo fallisce l'azione mostra un
  errore e la dichiarazione resta `pending` (riprovabile). Idempotenza:
  la conferma controlla `status = 'pending'` prima di agire.
- `rifiutaDichiarazioneAction` — solo rappresentante; `pending` → `rejected`.

Tutte verificano membership **attiva** e `class_id` di appartenenza (regola
CLAUDE.md §7). Query e mutazioni solo via `lib/db/queries.ts` /
`lib/db/mutations.ts`.

### UI (componenti nuovi o modificati)

- `ComePagareBox` — riquadro coordinate col bottone Copia (client component,
  `navigator.clipboard`; fallback: testo selezionabile).
- `DichiaraVersamentoForm` — form del genitore.
- `DaConfermareList` — lista + conferma/rifiuta per il rappresentante.
- `VersamentoForm` esistente — aggiunge il selettore metodo.
- Coordinate: nuova sezione "Coordinate di pagamento" nella pagina
  `impostazioni` esistente (si cambiano di rado: stanno con le impostazioni).
  Se mancano, il rappresentante vede in cassa un invito "Imposta le
  coordinate" che porta lì.
- Export CSV: colonna "Metodo".
- Storico: il metodo compare accanto a ogni versamento.
- Testi in `lib/i18n/it.ts`, mai hardcoded. Touch target ≥ 48px, font ≥ 18px.

## Rimozione Stripe

- Cancellare: `lib/stripe.ts`, `VersaOnlineForm.tsx`, `cassa/conferma/`,
  `collegaStripeAction`, `versaOnlineAction`, `recordStripeDeposit`,
  `setClassStripeAccount`, i testi i18n relativi, la dipendenza `stripe`.
- Migrazione 0006 toglie le colonne (vedi sopra).
- `DECISIONS.md`: nuovo ADR "Pagamenti fuori dall'app con conferma del
  rappresentante" che **supera ADR-014**, con la motivazione (KYC +
  commissioni sproporzionati; i genitori usano già i loro strumenti).
- `ROADMAP.md`: aggiornare V1.6 (via le voci Stripe, dentro le nuove).

## Casi limite e decisioni esplicite

- **Genitore dichiara ma non ha pagato**: i saldi non si muovono senza
  conferma — regge per costruzione.
- **Rappresentante non conferma mai**: il contatore sta in cima alla cassa;
  se nel pilota non basta è un problema di notifiche (V1.1), non di schema.
- **IBAN esposto**: visibile solo ai membri attivi (RLS + pagina protetta).
  Oggi lo stesso IBAN gira in chiaro su WhatsApp: non si peggiora nulla.
- **Dichiarazione doppia**: possibile (il genitore preme due volte in giorni
  diversi); il rappresentante rifiuta la doppia. Il limite di 5 contiene gli
  eccessi.
- **Importo dichiarato ≠ importo arrivato**: il rappresentante corregge
  l'importo alla conferma; fa fede quello confermato.
- **Modifica coordinate a metà anno**: nessun vincolo; i movimenti passati
  non cambiano (il metodo è sul movimento, non sulle coordinate).

## Test

- **Unit (vitest)**: validazione IBAN/PayPal/telefono in `lib/validation/`;
  eventuale logica pura nuova in `lib/cassa/`.
- **Manuale su TEST5B** (da aggiungere a TEST_PLAN.md):
  1. Rappresentante compila coordinate → genitore le vede e copia l'IBAN.
  2. Genitore dichiara 10 € bonifico → rappresentante vede "Da confermare (1)"
     → conferma → saldi e storico aggiornati con metodo "bonifico".
  3. Rifiuto → il genitore vede "rifiutata", saldi invariati.
  4. Sesta dichiarazione in attesa → bloccata con messaggio chiaro.
  5. Export CSV con colonna metodo.
  6. Riquadro "Come pagare" con solo IBAN compilato (parziale).
  7. Un genitore NON vede le dichiarazioni di un altro genitore.

## Fuori scope (esplicito)

- Pagamenti dentro l'app (nessun intermediario di pagamento in V1).
- Notifiche push/email al rappresentante per nuove dichiarazioni (V1.1).
- Riconciliazione automatica con l'estratto conto.
- Rimborsi e storni strutturati (si gestiscono con movimenti manuali).
