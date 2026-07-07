# ClasseHub

Bacheca semplice per le classi scolastiche. Sostituisce il caos delle chat WhatsApp senza rimpiazzare WhatsApp.

## Stato
App su **Supabase** (Postgres + Auth magic link + Storage, RLS su ogni
tabella, regione Francoforte/GDPR), verificata end-to-end (vedi
`docs/TEST_PLAN.md`). In sviluppo resta la "modalità dimostrazione":
le email non partono e il link d'accesso compare in un riquadro giallo.
Setup e variabili d'ambiente in `docs/SETUP.md`. Roadmap in
`docs/ROADMAP.md`.

## Documenti
- `CLAUDE.md` — protocollo di lavoro con Claude Code
- `docs/PROJECT_SPEC.md` — cosa è, cosa non è
- `docs/ARCHITECTURE.md` — stack, DB, RLS
- `docs/UX_PRINCIPLES.md` — regole UI per target 50-60 anni
- `docs/ROADMAP.md` — milestone V1
- `docs/DECISIONS.md` — ADR
- `docs/SETUP.md` — come passare dallo store locale a Supabase
- `docs/TEST_PLAN.md` — test manuale end-to-end con esiti

## Sviluppo locale (modalità dimostrazione)
```bash
corepack pnpm install
corepack pnpm dev
```
Nessuna configurazione necessaria: apri http://localhost:3000 e usa il
pulsante "Apri il link dell'email (demo)" al posto delle email vere.
Per ripartire da zero cancella la cartella `.data/`.

## Deploy
Vercel (prod) + Supabase eu-central-1. Prima del deploy serve il
passaggio a Supabase descritto in `docs/SETUP.md`.

## Licenza
Progetto personale. Da decidere prima di eventuale open source.
