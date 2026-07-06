# ClasseHub

Bacheca semplice per le classi scolastiche. Sostituisce il caos delle chat WhatsApp senza rimpiazzare WhatsApp.

## Stato
V1 in sviluppo. Vedi `docs/ROADMAP.md`.

## Documenti
- `CLAUDE.md` â€” protocollo di lavoro con Claude Code
- `docs/PROJECT_SPEC.md` â€” cosa Ã¨, cosa non Ã¨
- `docs/ARCHITECTURE.md` â€” stack, DB, RLS
- `docs/UX_PRINCIPLES.md` â€” regole UI per target 50-60 anni
- `docs/ROADMAP.md` â€” milestone V1
- `docs/DECISIONS.md` â€” ADR

## Sviluppo locale
```bash
pnpm install
cp .env.example .env.local
# configura Supabase URL + anon key
pnpm dev
```

## Deploy
Vercel (prod) + Supabase eu-central-1.

## Licenza
Progetto personale. Da decidere prima di eventuale open source.