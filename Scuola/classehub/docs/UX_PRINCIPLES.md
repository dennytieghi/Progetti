# UX_PRINCIPLES â€” ClasseHub

Target primario: genitore 50-60 anni, low-tech, che apre l'app da link WhatsApp sul telefono.

## Regole tipografiche

- **Body**: 18px (mobile) / 17px (desktop). Mai sotto.
- **Titoli card post**: 22-24px, semibold.
- **H1 pagina**: 28-32px.
- **Micro-copy**: 15px minimo.
- **Font family**: system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). No web font custom in V1 (velocitÃ  + familiaritÃ ).
- **Line-height**: 1.6 per il body.

## Regole di interazione

- **Touch target**: 48Ã—48px minimo. Bottoni primari 56px altezza su mobile.
- **Spazio tra bottoni**: â‰¥12px.
- **Zone touch**: bottoni primari in basso su mobile (thumb reach).
- **Un'azione primaria per schermata**. Massimo un CTA a piena larghezza in evidenza.
- **Numero di scelte simultanee**: â‰¤4 per schermata.

## Contrasto e colori

- **Testo body**: contrasto â‰¥ 7:1 su sfondo (WCAG AAA dove possibile).
- **Palette V1**: neutrale (bianco/grigi) + un colore accento per azioni (blu #1E4FD8 o verde bosco #2F6B4E â€” testare entrambi con Denny).
- **Colori semantici**: rosso solo per errori e distruttivi, giallo/ambra per warning/scadenze imminenti, verde per successo/sondaggio chiuso.
- **Nessun colore diverso** per decorazione. Il colore ha sempre significato.

## Copy (italiano)

- **Seconda persona singolare**, informale ma rispettosa. "Puoi votare fino a venerdÃ¬" non "Il voto Ã¨ possibile entro venerdÃ¬".
- **Verbi al presente indicativo**. No condizionali gratuiti ("potresti volerâ€¦").
- **Zero jargon**: mai "login/logout" â†’ usa "Entra/Esci". Mai "post" â†’ usa "Avviso" o il tipo specifico. Mai "dashboard" â†’ usa "Bacheca".
- **Errori** = frasi complete + suggerimento azione. Esempi:
  - âŒ "Invalid code"
  - âœ… "Il codice classe non esiste. Controlla di averlo scritto giusto o chiedilo al rappresentante."
- **Conferme distruttive**: sempre modal con "SÃ¬, archivia" / "No, torna indietro". Mai "OK/Cancel".

## Pattern UI riutilizzabili

- **PostCard**: icona tipo (emoji o lucide) + titolo grande + preview 2 righe + data. Pinned in cima con banner.
- **EmptyState**: illustrazione minimal + frase in italiano + CTA. Es. "Ancora nessun avviso. Quando il rappresentante ne pubblica uno, lo vedi qui."
- **Loading**: skeleton, non spinner globale. Spinner solo nei bottoni durante submit.
- **Errori di rete**: banner giallo in cima con "Riprova" cliccabile.

## Anti-pattern vietati

- âŒ Modali per informazioni (usa pagine dedicate).
- âŒ Hamburger menu con feature nascoste. Menu massimo 4 voci, visibili.
- âŒ Tab bar con >4 voci.
- âŒ Tooltip su hover come unico modo di scoprire una feature (non funzionano su touch).
- âŒ Icone senza label testuale sotto i bottoni principali.
- âŒ Placeholder come unica label di un input (label sempre sopra + placeholder come esempio).
- âŒ Animazioni "carine". Solo funzionali.
- âŒ Dark mode auto in V1. Solo light, coerente e prevedibile.

## AccessibilitÃ  V1 (baseline)

- Tutti i form: label â†” input via `htmlFor`.
- Tutti i bottoni: testo o `aria-label`.
- Focus visibile: outline sempre attivo, mai `outline: none` senza sostituto.
- Tastiera: ogni azione raggiungibile senza mouse.
- Aria-live sui feedback di submit ("Avviso pubblicato").

## Test qualitativo obbligatorio prima del pilota

Denny testa personalmente:
1. Un parente/vicino 50-60 anni, senza istruzioni, riceve link WhatsApp e deve votare un sondaggio. Cronometrare secondi al voto.
2. Se >90 secondi o >5 tap: iterare copy o layout.