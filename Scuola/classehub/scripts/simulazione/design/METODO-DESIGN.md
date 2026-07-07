# Test di design — Indice di Semplicità (0-100)

Obiettivo: misurare se ClasseHub è **semplice, immediato e veloce anche per un
genitore di 50-60 anni con poca esperienza**, usando l'app vera piena dei dati
dell'anno simulato (classe TEST5B, 101 post). Le regole non le inventiamo qui:
sono quelle già promesse in `docs/UX_PRINCIPLES.md` — questo test verifica che
siano mantenute davvero, schermata per schermata.

## Come si misura

Tre blocchi. Tutto ciò che è misurabile viene misurato dal DOM con uno script
(niente giudizi a occhio); ciò che è esperienziale segue una rubrica fissa
con prove fotografiche (screenshot).

### A. Conformità misurata (0-40) — dal DOM, su 8 schermate chiave

Schermate: landing, entra-in-classe, bacheca, dettaglio avviso, dettaglio
sondaggio (voto), nuovo post (rappresentante), richieste, approvazioni.

- **A1 Tipografia (0-10)** — quota di testo visibile con corpo ≥17px
  (micro-copy ≥15px) e line-height ≥1.5 sui paragrafi.
  `punti = 10 × quota_conforme` (media delle schermate).
- **A2 Bersagli tattili (0-10)** — quota di elementi interattivi con lato
  minore ≥48px (mezzo punto per 44-47px, tolleranza Apple).
  `punti = 10 × quota_conforme`.
- **A3 Contrasto (0-10)** — quota di testo con contrasto ≥7:1 (obiettivo AAA
  del progetto); il testo tra 4,5:1 e 7:1 (AA) vale metà.
  `punti = 10 × (quota_AAA + 0,5 × quota_soloAA)`.
- **A4 Sobrietà e linguaggio (0-10)** — per schermata: azioni primarie
  simultanee ≤4 (le voci di una lista non contano) e **un solo** CTA in
  evidenza (2,5 punti a metà tra i due criteri, media schermate); gergo
  vietato nel testo visibile (login, logout, post, dashboard, submit, error,
  OK/Cancel, admin, feature…): −1 punto per parola trovata.

### B. Percorsi vissuti (0-40) — 4 viaggi, 10 punti l'uno

Eseguiti sull'app vera, su viewport da telefono (390px), contando i tap e
fotografando ogni passo. Budget presi da PROJECT_SPEC e UX_PRINCIPLES.

| Viaggio | Persona | Budget |
|---|---|---|
| J1 Dal link WhatsApp al voto | Giovanni, 58, low-tech | ≤5 tap, senza istruzioni |
| J2 Capire una scadenza (cosa/entro quando) | Giovanni | tutto leggibile dalla card + dettaglio, 0 ambiguità |
| J3 Pubblicare una scadenza e copiarla per WhatsApp | Denise, rappresentante | percorso <60s ⇒ ≤8 tap, nessun campo ambiguo |
| J4 Ritrovare quota e scadenza gita a fine anno | Irene, arrivata a novembre | trovata con bacheca piena (101 post) |

Rubrica per viaggio: si parte da 10, poi
−1 per ogni tap oltre budget · −2 per ogni esitazione (elemento che una
persona low-tech non capirebbe al primo colpo: va motivata) · −4 per ogni
blocco (serve aiuto esterno) · −1 se dopo un'azione manca il feedback
("fatto!", spinner, conferma). Minimo 0.

### C. Prova d'inclusione (0-20) — checklist binaria pesata

| Controllo | Punti |
|---|---|
| Errore utile: codice classe sbagliato ⇒ frase completa + rimedio | 4 |
| Viewport 390px: nessuno scroll orizzontale, nulla di tagliato | 4 |
| Zoom testo 200%: layout non si rompe, nulla di illeggibile | 2 |
| Label sempre visibili sopra gli input (mai solo placeholder) | 2 |
| Bottoni principali: testo, mai icona sola | 2 |
| Un'unica azione primaria per schermata (verifica visiva) | 2 |
| Niente menu hamburger / feature nascoste | 2 |
| Focus visibile navigando con TAB | 2 |

## Anti-imbroglio

- Le misure A vengono da uno script iniettato nella pagina vera
  (`raccogli-misure.js`), non dal codice sorgente: contano i pixel renderizzati.
- I viaggi B contano i tap dai log di navigazione e ogni esitazione va
  motivata con lo screenshot del punto ambiguo.
- Il punteggio finale è calcolato da `punteggio-design.js` a partire dai file
  di misure: rifare il test dà lo stesso risultato.

## Soglie di lettura

≥85 = pronto per il pilota senza riserve · 70-84 = pronto con lista di ritocchi
· 50-69 = serve un giro di correzioni prima del pilota · <50 = fermarsi.
