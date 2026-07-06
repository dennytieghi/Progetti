# CLAUDE.md â€” Istruzioni operative per Claude Code

Questo file Ã¨ la **prima cosa** che leggi ad ogni sessione. Non ignorarlo.

## 1. Metodo di lavoro (non negoziabile)

- **Premesse esplicite**: prima di scrivere codice, dichiara le assunzioni. Se sono â‰¥3 o non banali, elencale e chiedi conferma.
- **POV rotation**: per ogni feature non triviale, valuta dal punto di vista di (a) rappresentante di classe, (b) genitore 55 anni low-tech, (c) attaccante/spammer, (d) sviluppatore che erediterÃ  il codice.
- **Pro/contro esplicitati** per scelte architetturali non banali.
- **Falsificazione**: prima di implementare, prova a rompere l'idea. Almeno 2 tentativi di rottura documentati nei commit non triviali.
- **Un'unica raccomandazione azionabile** con condizioni di revisione. Niente "dipende, potresti fare X o Y".
- **Framing emotivo**: solo funzionale (fiducia utente, semplicitÃ  percepita, paura di sbagliare del genitore anziano). Niente marketing-speak.

## 2. Anti-pattern vietati

- âŒ Yes-man ("ottima idea!"). Se una richiesta Ã¨ debole tecnicamente, dillo.
- âŒ Accademismo (spiegazioni lunghe di pattern noti).
- âŒ Wishful thinking ("dovrebbe funzionare"). Testa.
- âŒ Cautela difensiva (aggiungere "TODO: gestire errore" senza gestirlo).
- âŒ Over-engineering. V1 Ã¨ V1. Ogni astrazione va giustificata.
- âŒ Feature creep. Se una feature non Ã¨ in `ROADMAP.md` sezione V1, non implementarla; proponi di aggiungerla a V1.1.

## 3. Ordine di lettura obbligatorio all'avvio sessione

1. `CLAUDE.md` (questo file)
2. `docs/PROJECT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DECISIONS.md`
5. Task corrente del developer

## 4. Stack e vincoli tecnici

- **Framework**: Next.js 15+ (App Router, Server Components di default, Client solo se strettamente necessario).
- **Linguaggio**: TypeScript strict.
- **Styling**: Tailwind CSS + shadcn/ui. Nessuna altra UI lib.
- **Backend**: Supabase (Auth magic link, Postgres, Storage, RLS attivo su tutte le tabelle).
- **Deploy**: Vercel.
- **Regione dati**: `eu-central-1` (Francoforte) â€” GDPR.
- **i18n**: italiano only in V1. Testi in `lib/i18n/it.ts`, mai hardcoded nei componenti.
- **Icons**: `lucide-react`. Emoji ok nei contenuti utente/copy, no negli identificatori.
- **Package manager**: pnpm.
- **Node**: 20 LTS.

## 5. Convenzioni di codice

- File component: `PascalCase.tsx`.
- Utility: `kebab-case.ts`.
- Route App Router: cartella lowercase, `page.tsx` / `layout.tsx` / `actions.ts`.
- Server Actions in `actions.ts` accanto alla `page.tsx` che le usa.
- Schema Zod per ogni input Server Action.
- Query DB solo via helper in `lib/db/*.ts`, mai inline nei componenti.
- Types generati da Supabase in `lib/db/types.gen.ts` (rigenerati con `pnpm db:types`).

## 6. Regole UX (dettaglio in `UX_PRINCIPLES.md`)

- Touch target â‰¥ 48px.
- Font base 18px minimo (non 16px). Titoli 24-32px.
- Contrasto WCAG AA minimo.
- Copy in italiano semplice, seconda persona singolare, no gergo tecnico.
- Errori come frasi complete e utili ("Il codice classe che hai scritto non esiste. Controlla che sia esatto o chiedilo al rappresentante."), non "Error 404".
- Zero animazioni gratuite. Solo feedback funzionale (spinner su azioni async).

## 7. Sicurezza (non violare mai)

- **RLS attiva su ogni tabella**. Nessuna tabella pubblica.
- Nessun `service_role` key esposto client-side.
- Server Actions verificano *sempre* `class_id` di appartenenza dell'utente prima di operare.
- **Ogni Server Action che opera su una classe verifica `membership.status = 'active'`, non solo l'esistenza della membership. Un pending non deve poter fare nulla.**
- Zod valida *ogni* input utente.
- Rate limit sulle Server Actions di scrittura (usa `@upstash/ratelimit` o equivalente semplice in-memory con Vercel KV se serve).

## 8. Testing

- V1: test manuale documentato in `docs/TEST_PLAN.md` (che genererai dopo lo scaffolding).
- Unit test solo per logica pura in `lib/` (con `vitest`).
- No E2E in V1 (rimandati a V1.1).

## 9. Commit

- Messaggi in italiano, imperativo presente ("Aggiungi login magic link", non "Aggiuntoâ€¦").
- Un commit = un cambiamento logico.
- Se un commit tocca â‰¥3 file di dominio diverso, dividilo.

## 10. Come rispondermi

- Preambolo breve (max 2 righe).
- Poi il lavoro.
- Fine con **una** domanda o **una** proposta di prossimo passo, non entrambe.
- Se hai dubbi che bloccano, fermati e chiedi *prima* di scrivere codice.