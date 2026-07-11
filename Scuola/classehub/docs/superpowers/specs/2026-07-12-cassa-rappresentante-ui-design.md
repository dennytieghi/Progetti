# Design — Cassa del rappresentante riorganizzata (UI-only)

Data: 2026-07-12
Stato: approvato da Denny
Ambito: SOLO interfaccia e navigazione lato rappresentante. Nessun cambio a
schema DB, RLS, `lib/cassa/saldi.ts`, vista genitore (ADR-017) o flusso
dichiara→conferma (ADR-016).

## Principio

La cassa è anzitutto un saldo da consultare, non un form da riempire. Oggi la
home apre con due form sempre espansi, il box WhatsApp a piena altezza e la
lista completa: troppo scroll per azioni rare. Si inverte: dati in cima,
azioni come pulsanti, form su pagine dedicate.

## Correzioni rispetto alla richiesta originale (concordate)

- Stripe NON esiste più (ADR-016): niente `source`, niente sezione carta,
  niente `STRIPE_SECRET_KEY`. I pagamenti non-contanti entrano via
  dichiara→conferma col loro `method`.
- Il metodo di pagamento nel form manuale NON si rimuove: resta **ripiegato**
  (default "in contanti", link "ha pagato in un altro modo?" che apre il
  selettore). Decisione di Denny: CSV sempre veritiero.
- "Ultimi movimenti" viola il vincolo zero-jargon della richiesta stessa →
  titolo **"Le ultime entrate e uscite"**.
- La sezione "Da confermare (N)" (segnalazioni dei genitori) resta in home,
  subito sotto il saldo: è la posta in arrivo.

## Pagine (tutte `requireRepresentative`, tranne la home che resta condivisa)

### `/cassa` — home (page.tsx, ramo rappresentante; ramo genitore INTATTO)

Dall'alto:
1. **Saldo grande**: "In cassa adesso" + importo (`text-[44px]`, centrato).
   Sotto: "3 genitori devono ancora versare 10,50 €" (conteggio e somma dei
   saldi negativi da `saldiPerMembroCents`). Se nessun debito: niente riga.
   Rimosse le due card affiancate attuali.
2. **"Da confermare (N)"** se ci sono segnalazioni (componente esistente).
3. **Due pulsanti grandi affiancati** (min-h 64px):
   "Ho ricevuto soldi" → `/cassa/versamento` · "Ho speso soldi" → `/cassa/spesa`.
4. **"Chi deve versare"**: SOLO saldi negativi; riga = nome + "deve 3,50 €"
   (rosso) + pulsante "Ha pagato" → `/cassa/versamento?genitore=<id>`.
   Accanto al titolo: pulsante "Ricorda a tutti" → `/cassa/promemoria`.
   Empty state: "Sono tutti a posto."
5. **Accordion chiuso** (`<details>` nativo): "N genitori sono a posto" →
   lista di TUTTI i membri attivi con saldo ≥ 0 (anche chi non ha movimenti:
   saldo 0), saldo a fianco in grigio.
6. **"Le ultime entrate e uscite"**: ultimi 5, card senza Modifica/Elimina.
   In fondo, due pulsanti secondari: "Vedi tutti" → `/cassa/movimenti` e
   "Excel" → route esporta esistente.
7. L'invito "Inserisci le coordinate" resta se le coordinate mancano.
8. Via dalla home: form versamento/spesa inline, box WhatsApp, filtri,
   lista completa, saldi per membro come sezione a sé (assorbiti da 4+5).

### `/cassa/versamento` — "Ho ricevuto soldi"

- Scelta genitore: NON un `<select>`. Lista di bottoni (min-h 52px), uno per
  membro attivo, a destra "deve 3,50 €" in rosso oppure "a posto" in grigio.
  Ordinamento: debitori prima (debito decrescente), poi gli altri per nome.
- Campo importo grande (min-h 52px, testo a destra, "€" a fianco). Alla
  scelta del genitore si PRECOMPILA con il dovuto ma resta modificabile.
  Micro-copy sotto, dinamica: "Deve 3,50 €. Se ti ha dato di più o di meno,
  correggi." / "Non deve niente: sta versando in anticipo."
- Causale facoltativa (come oggi).
- Metodo ripiegato: testo "In contanti · ha pagato in un altro modo?" —
  il link apre il selettore dei 5 metodi (default contanti).
- **Riepilogo live** prima del pulsante: "Elena Gatti ti ha dato 3,50 €.
  In cassa: 39,50 €." (saldo attuale passato dal server + importo digitato).
- CTA pieno unico (min-h 56px): "Registra il versamento".
- `?genitore=<id>` preseleziona genitore e precompila l'importo dovuto
  (è l'azione rapida "Ha pagato": un tocco per arrivare, uno per registrare).
- Server action: la `registraVersamentoAction` esistente, con redirect verso
  `/cassa/versamento/conferma?m=<movementId>` invece di `?fatto=1`.

### `/cassa/versamento/conferma?m=<movementId>` — la catena

- Verifica server: movimento esistente, della classe del rappresentante,
  `kind='deposit'`; altrimenti redirect alla cassa.
- Banner verde: "Versamento registrato — Elena Gatti ti ha dato 3,50 € in
  contanti." + "Ora è a posto." SOLO se il suo saldo ora è ≥ 0.
- Card "In cassa adesso" (totale attuale) con sotto "prima: 36,00 €"
  (= attuale − totale del movimento, calcolato lato server).
- Card "Manca ancora": "N genitori · 7,00 €" (o "Nessuno: sono tutti a posto").
- Lista "Chi deve ancora versare" con i pulsanti "Ha pagato"
  (→ `/cassa/versamento?genitore=<id>`): tre versamenti di fila senza
  tornare alla home.
- Pulsanti: "Annulla questo versamento" (conferma distruttiva "Sì, annulla /
  No, torna indietro", riusa `eliminaMovimentoAction`, poi torna alla cassa)
  e "Torna alla cassa" (secondario).

### `/cassa/spesa` — "Ho speso soldi"

`SpesaForm` esistente spostato su pagina dedicata, titolo "Ho speso soldi",
CTA 56px. Al termine torna alla cassa col banner di oggi.

### `/cassa/movimenti` — tutto lo storico

Trasloco di ciò che oggi sta in fondo alla home: lista completa, filtri
Tutti/Versamenti/Spese + per genitore, card con Modifica/Elimina, export
con i filtri attivi. (Il genitore NON ha link a questa pagina; se la apre,
l'RLS gli mostra comunque solo il suo — ma la pagina è pensata per il
rappresentante e la si protegge con `requireRepresentative`.)

### `/cassa/promemoria` — "Ricorda a tutti"

Pagina (non modal) col testo di `formatCassaReminderForWhatsapp` nel
componente `PromemoriaWhatsapp` esistente (textarea + Copia). Modifica al
messaggio: il titolo include il NOME della classe
("💰 CASSA DI CLASSE — 5B Simulazione — Servono nuovi versamenti") perché nei
gruppi con più classi "CASSA DI CLASSE" da solo è ambiguo. Il messaggio
continua a NON contenere importi personali (regola ferma).

## Vincoli UX (da UX_PRINCIPLES)

Body ≥ 18px mobile; touch target ≥ 48px, CTA primari 56px, bottoni-lista
52px, bottoni azione home 64px. Un solo CTA pieno per pagina. Zero jargon:
"Ho ricevuto soldi", "Ho speso soldi", "Ha pagato", "deve 3,50 €",
"Sono tutti a posto.", "Le ultime entrate e uscite". Rosso solo per debiti e
spese. Niente modali informativi (modal solo per l'annullo distruttivo).
Empty state ed errori in frasi complete italiane. Testi in `lib/i18n/it.ts`.

## Dati (nessun cambio schema)

- Debitori / "a posto": da `saldiPerMembroCents` (esistente, non si tocca)
  unita alla lista membri attivi — chi non compare nella mappa ha saldo 0.
  La fusione è fatta nella pagina (o in un helper puro NUOVO se serve in due
  pagine — `lib/cassa/saldi.ts` non si modifica, si può creare un file
  accanto, es. `lib/cassa/debitori.ts`, con unit test).
- "In cassa adesso" del rappresentante: `saldoCassaCents` come oggi.
- Il riepilogo live nel form usa il saldo attuale passato come prop.

## Test

- Unit (vitest): helper `debitori`/fusione saldi-membri (se estratto);
  aggiornamento test di `formatCassaReminderForWhatsapp` (nome classe).
- Manuale su TEST5B (rappresentante): home nuova con saldo/da confermare/
  chi deve versare/accordion/ultime 5; catena "Ha pagato" ×2 di fila con
  conferma e "prima:"; annulla dalla conferma (il saldo torna indietro);
  spesa da pagina dedicata; movimenti con filtri e modifica/elimina; export;
  promemoria con nome classe; **vista genitore INVARIATA** (Laura).

## Fuori scope

- Vista genitore (ADR-017, già fatta).
- Qualsiasi cambio a schema, RLS, saldi, dichiarazioni, export.
- Restyling di altre pagine.
