# DESIGN — ClasseHub

Riferimento vincolante per qualunque modifica di UI. Se un cambiamento
di stile non è coperto da questo file, chiedi prima di improvvisare —
non introdurre colori, font o raggi fuori scala.

## Filosofia

Sfondo chiaro, un solo colore di brand (indaco) per azioni e
navigazione, quattro colori semantici per i tipi di contenuto, rosso
riservato solo all'urgenza ("in evidenza"). Niente superfici scure
diffuse: la sidebar è bianca, non un pannello scuro.

Un solo elemento colorato per riga/card. Se una card ha già il colore
di categoria (icona), l'urgenza si segnala con un'etichetta di testo
piccola, mai con un secondo blocco di colore.

## Palette

```
Brand (azioni, nav attiva, bottoni primari):
  --indigo: #5B4FE8
  --indigo-tint: #F1F0FE   (hover leggero, mai come sfondo pieno)

Neutri:
  --bg: #FBFAF6            sfondo pagina
  --card: #FFFFFF          sfondo card e sidebar
  --border: #ECEAE1        bordo hairline, 1px sempre
  --ink: #16181D           testo primario
  --ink-soft: #6B7280      testo secondario
  --ink-faint: #A7ACB8     meta/placeholder

Tipo di contenuto (icona + badge, un tocco per elemento):
  Avviso     --yellow: #FFC738  tint #FFF6DC  testo su giallo: #4A3600 (mai bianco, contrasto insufficiente)
  Scadenza   --orange: #E8622C  tint #FFE6D9  testo su tint: #973016
  Sondaggio  --blue:   #2F6FED  tint #E7F0FE  testo su tint: #1E4CB8
  Materiale  --green:  #16A672  tint #E1F5EC  testo su tint: #0E7A54

Urgenza (solo per "in evidenza" / pinnati, mai per categoria):
  --red: #E23B3B  tint #FDE6E6  testo su tint: #A42323
```

Regola di contrasto: badge/icona su sfondo colorato pieno usa testo
bianco, TRANNE il giallo che usa testo scuro (#4A3600). Questa è
l'unica eccezione, per leggibilità (WCAG), non cambiarla per
coerenza estetica.

## Tipografia

- Titoli, nomi post, numeri statistica: **Space Grotesk** (500/600/700).
- Corpo, label, meta, form: **Inter** (400/500/600/700).
- Nessun terzo font. Se in passato hai visto riferimenti a un font
  corsivo/handwriting nei mockup precedenti, è stato scartato — non
  usarlo.
- Scala (decisione 12/7/2026, vince CLAUDE.md §6 sui px dei mockup):
  H1 28px/700, titolo card 22px/600, corpo 18px mobile / 17px desktop,
  meta/label 15px minimo (maiuscolo con letter-spacing 0.03-0.07em
  dove il mockup lo prevede). I mockup restano il riferimento per
  layout, colori e pattern, NON per i corpi dei font: il target
  genitore 50-60enne legge dal telefono.

```tsx
// app/layout.tsx
import { Space_Grotesk, Inter } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

// nel body: className={`${spaceGrotesk.variable} ${inter.variable}`}
```

## Scala forme e spaziatura

```
Raggi:    6px chip/badge piccoli · 10px bottoni e righe · 16px card · 22px contenitori/pannelli
          Badge/pill di stato: border-radius 999px (pillola piena)
Spaziatura: usa multipli di 4px. Gap standard tra card: 10px. Padding card: 13-16px.
Bordo:    1px solid, sempre var(--border) salvo quando il bordo comunica lo stato al hover
          (allora diventa var(--type-color) della card, vedi sotto)
```

## Pattern di componenti

**Sidebar**: sfondo bianco (`--card`), bordo destro 1px, voce attiva con
sfondo `--indigo` pieno e testo bianco, le altre voci testo `--ink-soft`
con hover `#F5F4EE`.

**Pannello riepilogo** (in cima a ogni schermata con dati sintetici):
contenitore bordato (`--card`, bordo 1px, radius 22px) che racchiude
saluto/titolo pagina + bottone primario + barra statistiche. È
delimitato — non deve confondersi visivamente col feed sottostante.

**Barra statistiche**: NON quattro box separati colorati. Una riga
unica dentro il pannello riepilogo, divisa da bordi verticali 1px tra
i segmenti. Ogni segmento: pallino 7px del colore semantico + label
piccola sopra + numero grande (Space Grotesk 22px/700) sotto.

**Separatore di sezione**: dopo il pannello riepilogo, prima di
qualunque contenuto (messaggio pinnato, feed), inserisci sempre
un'etichetta maiuscola + linea orizzontale (es. "BACHECA ————") per
segnare dove iniziano i contenuti. Margine 26px sopra, 16px sotto.

**Card post nel feed**: bordo 1px `--border` di default; al hover il
bordo diventa il colore di categoria e la card sale di 2px con ombra
leggera (`box-shadow: 0 8px 20px rgba(20,20,30,0.08)`). Icona in chip
32-34px con sfondo pieno del colore di categoria. Badge tipo: pillola
piena dello stesso colore, testo sopra (bianco, tranne giallo). Se il
post è "in evidenza": aggiungi SOLO una piccola label testuale rossa
con icona pin a fianco del badge tipo — non cambiare bordo/icona.

**Azione al hover**: ogni riga del feed mostra un link testuale
("Apri" / "Vota") che appare solo al passaggio del mouse
(`opacity` + `translateX`, transition 150ms). Serve a dare
percezione di reattività, non aggiungere altre animazioni oltre
questa e l'hover delle card.

**Box pinnato/urgente**: sfondo `--red-tint`, nessun bordo colorato
pesante, badge circolare rosso pieno con icona pin bianca a sinistra.

## Cosa NON fare

- Non usare sfondi scuri/saturi su contenitori grandi (sidebar,
  header pagina). Solo il pannello riepilogo può avere accenti di
  colore, e resta comunque su sfondo bianco.
- Non mettere due colori diversi sulla stessa card per due significati
  diversi (categoria + urgenza) — usa sempre il pattern
  icona-colorata + label-rossa-piccola descritto sopra.
- Non introdurre corsivo/handwriting per nessun testo.
- Non usare radius incoerenti con la scala sopra.
- Non applicare tutte le modifiche di stile in un'unica sessione su
  tutti i file: procedi per schermata (vedi sequenza comandi).

## Riferimento visivo

I mockup approvati sono in `design/mockups/`:
`classehub-redesign-v7.html` — versione corrente approvata (Bacheca).
Apri nel browser per vedere hover reali su card e bottoni.
