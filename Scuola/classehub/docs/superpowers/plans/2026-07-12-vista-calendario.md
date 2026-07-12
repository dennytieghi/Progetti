# Vista calendario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vista calendario settimana/mese della bacheca, con scadenze sul giorno di scadenza, colore dominante per tipo e toggle Annunci|Calendario nel pannello riepilogo (spec: `docs/superpowers/specs/2026-07-12-vista-calendario-design.md`).

**Architecture:** Pagina server `/c/[classCode]/calendario` con stato nell'URL (approccio A: ogni click è un link). Logica date/raggruppamento pura in `lib/calendario/` con vitest. Pannello riepilogo estratto in componente condiviso tra bacheca e calendario, con caricamento dati comune in `bacheca-dati.ts`.

**Tech Stack:** Next.js 15 App Router (Server Components), TypeScript strict, Tailwind v4 (token in `app/globals.css` `@theme`), vitest per la logica pura. Nessuna libreria calendario.

## Global Constraints

- Testi SOLO in `lib/i18n/it.ts` (ADR-010), italiano informale seconda persona.
- Server Component di default; QUESTA feature non introduce alcun client component (ADR-007).
- Scala font: base 18px, micro-copy ≥15px, titoli card 22px, H1 28px (CLAUDE.md §6 vince sui mockup).
- Touch target ≥48px; colori SOLO dai token esistenti (`brand`, `avviso|scadenza|sondaggio|materiale|urgente` + `-tint`/`-ink`/`-tint-ink`, `hairline`, `ink-faint`, `paper-hover`).
- Nessuna modifica a schema DB, Server Action o query (si usa `listPosts` e i dati già caricati).
- Commit in italiano, imperativo presente, un cambiamento logico per commit.
- Ogni comando di verifica: `corepack pnpm typecheck` e `corepack pnpm test` (mai `pnpm` liscio: corepack).
- Il dev server può già girare sulla 3000: NON riavviarlo; per la verifica visiva basta `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`.

---

### Task 1: Logica pura del calendario (`lib/calendario/`)

**Files:**
- Create: `lib/calendario/calendario.ts`
- Test: `lib/calendario/calendario.test.ts`

**Interfaces:**
- Consumes: `PostRow`, `PostType` da `@/lib/db/types`.
- Produces (usate dal Task 4):
  - `giornoItaliano(isoTimestamp: string): string` — YYYY-MM-DD in Europe/Rome
  - `giornoDelPost(post: Pick<PostRow, "type" | "created_at" | "due_date">): string`
  - `raggruppaPerGiorno(posts: PostRow[]): Map<string, PostRow[]>`
  - `tipoDominante(tipi: PostType[]): PostType | null` (priorità deadline > notice > poll > material)
  - `grigliaMese(anno: number, mese: number): CellaGiorno[][]` (mese 1-12; settimane lun→dom; `CellaGiorno = { data: string; nelMese: boolean }`)
  - `settimanaDi(dataYmd: string): string[]` (7 date lun→dom)
  - `aggiungiGiorni(dataYmd: string, n: number): string`
  - `spostaMese(dataYmd: string, delta: number): string` (stesso giorno, mese ±delta, clampato a fine mese)
  - `dataValida(s: string | undefined): s is string` (regex + data reale)

- [ ] **Step 1: Scrivi i test (falliranno)**

```ts
// lib/calendario/calendario.test.ts
import { describe, expect, it as test } from "vitest";
import {
  aggiungiGiorni,
  dataValida,
  giornoDelPost,
  giornoItaliano,
  grigliaMese,
  raggruppaPerGiorno,
  settimanaDi,
  spostaMese,
  tipoDominante,
} from "./calendario";
import type { PostRow } from "@/lib/db/types";

function post(p: Partial<PostRow>): PostRow {
  return {
    id: "x", class_id: "c", author_id: "a", type: "notice", slug: "s",
    title: "t", body: null, due_date: null, pinned: false, archived: false,
    photo_path: null, created_at: "2026-07-09T10:00:00+00:00", edited_at: null,
    ...p,
  } as PostRow;
}

describe("giornoItaliano", () => {
  test("converte al fuso italiano (estate: UTC+2)", () => {
    // 21:30 UTC del 9 luglio = 23:30 italiane del 9 luglio
    expect(giornoItaliano("2026-07-09T21:30:00+00:00")).toBe("2026-07-09");
    // 22:30 UTC del 9 luglio = 00:30 italiane del 10 luglio
    expect(giornoItaliano("2026-07-09T22:30:00+00:00")).toBe("2026-07-10");
  });
});

describe("giornoDelPost", () => {
  test("scadenza sul giorno di scadenza", () => {
    const p = post({ type: "deadline", due_date: "2026-07-20T00:00:00+00:00" });
    expect(giornoDelPost(p)).toBe("2026-07-20");
  });
  test("gli altri sul giorno di pubblicazione (fuso italiano)", () => {
    expect(giornoDelPost(post({ created_at: "2026-07-09T22:30:00+00:00" }))).toBe(
      "2026-07-10"
    );
  });
});

describe("tipoDominante", () => {
  test("priorità scadenza > avviso > sondaggio > materiale", () => {
    expect(tipoDominante(["material", "poll", "notice", "deadline"])).toBe("deadline");
    expect(tipoDominante(["material", "poll", "notice"])).toBe("notice");
    expect(tipoDominante(["material", "poll"])).toBe("poll");
    expect(tipoDominante(["material"])).toBe("material");
    expect(tipoDominante([])).toBeNull();
  });
});

describe("raggruppaPerGiorno", () => {
  test("raggruppa per giorno calcolato", () => {
    const a = post({ id: "a", created_at: "2026-07-09T10:00:00+00:00" });
    const b = post({ id: "b", type: "deadline", due_date: "2026-07-09T00:00:00+00:00" });
    const c = post({ id: "c", created_at: "2026-07-10T10:00:00+00:00" });
    const m = raggruppaPerGiorno([a, b, c]);
    expect(m.get("2026-07-09")?.map((p) => p.id)).toEqual(["a", "b"]);
    expect(m.get("2026-07-10")?.map((p) => p.id)).toEqual(["c"]);
  });
});

describe("grigliaMese", () => {
  test("luglio 2026: inizia lunedì 29 giugno, finisce domenica 2 agosto", () => {
    const g = grigliaMese(2026, 7);
    expect(g[0]![0]).toEqual({ data: "2026-06-29", nelMese: false });
    expect(g[0]![2]).toEqual({ data: "2026-07-01", nelMese: true });
    const ultima = g[g.length - 1]!;
    expect(ultima[6]).toEqual({ data: "2026-08-02", nelMese: false });
    for (const settimana of g) expect(settimana).toHaveLength(7);
  });
});

describe("settimanaDi", () => {
  test("da un giovedì torna lun→dom", () => {
    expect(settimanaDi("2026-07-09")).toEqual([
      "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09",
      "2026-07-10", "2026-07-11", "2026-07-12",
    ]);
  });
  test("a cavallo di due mesi", () => {
    expect(settimanaDi("2026-08-01")[0]).toBe("2026-07-27");
  });
});

describe("aggiungiGiorni e spostaMese", () => {
  test("aggiungiGiorni scavalca il mese", () => {
    expect(aggiungiGiorni("2026-07-31", 1)).toBe("2026-08-01");
    expect(aggiungiGiorni("2026-07-01", -1)).toBe("2026-06-30");
  });
  test("spostaMese clampa a fine mese", () => {
    expect(spostaMese("2026-07-31", -1)).toBe("2026-06-30");
    expect(spostaMese("2026-07-15", 1)).toBe("2026-08-15");
  });
});

describe("dataValida", () => {
  test("accetta solo YYYY-MM-DD reali", () => {
    expect(dataValida("2026-07-09")).toBe(true);
    expect(dataValida("2026-02-30")).toBe(false);
    expect(dataValida("ciao")).toBe(false);
    expect(dataValida(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `corepack pnpm vitest run lib/calendario/calendario.test.ts`
Expected: FAIL — "Cannot find module './calendario'"

- [ ] **Step 3: Implementa**

```ts
// lib/calendario/calendario.ts
/**
 * Logica pura della vista calendario (spec 2026-07-12).
 * Tutte le date "giorno" sono stringhe YYYY-MM-DD; l'aritmetica usa
 * Date in UTC (mai il fuso del server) e la conversione al fuso
 * italiano avviene SOLO in giornoItaliano.
 */
import type { PostRow, PostType } from "@/lib/db/types";

export interface CellaGiorno {
  data: string;
  nelMese: boolean;
}

const FORMATO_ROMA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Timestamp ISO → YYYY-MM-DD nel fuso italiano ("en-CA" formatta così). */
export function giornoItaliano(isoTimestamp: string): string {
  return FORMATO_ROMA.format(new Date(isoTimestamp));
}

/** Scadenze sul giorno di scadenza; il resto sul giorno di pubblicazione. */
export function giornoDelPost(
  post: Pick<PostRow, "type" | "created_at" | "due_date">
): string {
  if (post.type === "deadline" && post.due_date) {
    // La due_date nasce da un input date (mezzanotte UTC): il giorno è
    // nei primi 10 caratteri, stessa convenzione di formatDateIt.
    return post.due_date.slice(0, 10);
  }
  return giornoItaliano(post.created_at);
}

export function raggruppaPerGiorno(posts: PostRow[]): Map<string, PostRow[]> {
  const mappa = new Map<string, PostRow[]>();
  for (const post of posts) {
    const giorno = giornoDelPost(post);
    const lista = mappa.get(giorno);
    if (lista) lista.push(post);
    else mappa.set(giorno, [post]);
  }
  return mappa;
}

const PRIORITA: PostType[] = ["deadline", "notice", "poll", "material"];

export function tipoDominante(tipi: PostType[]): PostType | null {
  for (const tipo of PRIORITA) if (tipi.includes(tipo)) return tipo;
  return null;
}

function daYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

function aYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function aggiungiGiorni(dataYmd: string, n: number): string {
  const d = daYmd(dataYmd);
  d.setUTCDate(d.getUTCDate() + n);
  return aYmd(d);
}

/** Stesso giorno del mese ±delta, clampato all'ultimo giorno del mese. */
export function spostaMese(dataYmd: string, delta: number): string {
  const d = daYmd(dataYmd);
  const giorno = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + delta);
  const ultimoGiorno = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(giorno, ultimoGiorno));
  return aYmd(d);
}

/** Lunedì della settimana di dataYmd (getUTCDay: 0=domenica). */
function lunediDi(dataYmd: string): string {
  const d = daYmd(dataYmd);
  const scarto = (d.getUTCDay() + 6) % 7;
  return aggiungiGiorni(dataYmd, -scarto);
}

export function settimanaDi(dataYmd: string): string[] {
  const lunedi = lunediDi(dataYmd);
  return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lunedi, i));
}

/** Settimane complete lun→dom che coprono il mese (mese 1-12). */
export function grigliaMese(anno: number, mese: number): CellaGiorno[][] {
  const primo = `${anno}-${String(mese).padStart(2, "0")}-01`;
  const prefisso = primo.slice(0, 7);
  const settimane: CellaGiorno[][] = [];
  let cursore = lunediDi(primo);
  do {
    settimane.push(
      Array.from({ length: 7 }, (_, i) => {
        const data = aggiungiGiorni(cursore, i);
        return { data, nelMese: data.startsWith(prefisso) };
      })
    );
    cursore = aggiungiGiorni(cursore, 7);
  } while (cursore.startsWith(prefisso));
  return settimane;
}

export function dataValida(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return aYmd(daYmd(s)) === s;
}
```

- [ ] **Step 4: Verifica che passino**

Run: `corepack pnpm vitest run lib/calendario/calendario.test.ts`
Expected: PASS (tutti). Poi `corepack pnpm typecheck` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/calendario/calendario.ts lib/calendario/calendario.test.ts
git commit -m "Aggiungi la logica pura della vista calendario"
```

---

### Task 2: Dati condivisi bacheca + pannello riepilogo con toggle

**Files:**
- Create: `app/(app)/c/[classCode]/bacheca-dati.ts`
- Create: `app/(app)/c/[classCode]/PannelloBacheca.tsx`
- Modify: `app/(app)/c/[classCode]/page.tsx` (usa i due nuovi moduli; il markup del pannello sparisce da qui)
- Modify: `lib/i18n/it.ts` (chiavi toggle)

**Interfaces:**
- Consumes: `giornoItaliano` non serve qui; query esistenti `listPosts`, `listUpcomingDeadlines`, `getPoll`, `isPollClosed`, `hasVoted`, `listMyReadPostIds`; `ClassContext` da require-membership.
- Produces:
  - `caricaDatiBacheca(ctx: ClassContext, opts: { includeArchived: boolean }): Promise<DatiBacheca>` con `DatiBacheca = { allPosts: PostRow[]; attivi: PostRow[]; evidenzaPosts: PostRow[]; nuoviPosts: PostRow[]; deadlines: PostRow[]; sondaggiAperti: PostRow[] }`
  - `<PannelloBacheca classCode nome isRepresentative dati attiva />` con `attiva: "annunci" | "calendario"` — pannello completo (saluto, toggle, + Pubblica, barra statistiche cliccabili).

- [ ] **Step 1: Crea `bacheca-dati.ts`** — spostando PARI PARI la logica oggi in `page.tsx` (righe: fetch + attivi/evidenza/nuovi/sondaggi aperti). Il file:

```ts
// app/(app)/c/[classCode]/bacheca-dati.ts
import "server-only";
import {
  getPoll,
  hasVoted,
  isPollClosed,
  listMyReadPostIds,
  listPosts,
  listUpcomingDeadlines,
} from "@/lib/db/queries";
import type { ClassContext } from "@/lib/auth/require-membership";
import type { PostRow } from "@/lib/db/types";

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;

export interface DatiBacheca {
  allPosts: PostRow[];
  attivi: PostRow[];
  evidenzaPosts: PostRow[];
  nuoviPosts: PostRow[];
  deadlines: PostRow[];
  sondaggiAperti: PostRow[];
}

/**
 * Dati e statistiche condivisi tra bacheca e calendario. Statistiche
 * PERSONALI: "nuovo" = ultimi 7 giorni non visti da me; "sondaggi
 * aperti" = dove non ho ancora votato (il voto vale come visto).
 */
export async function caricaDatiBacheca(
  ctx: ClassContext,
  opts: { includeArchived: boolean }
): Promise<DatiBacheca> {
  const deadlines = await listUpcomingDeadlines(ctx.klass.id);
  const allPosts = await listPosts(ctx.klass.id, {
    includeArchived: opts.includeArchived,
  });
  const attivi = allPosts.filter((p) => !p.archived);
  const evidenzaPosts = attivi.filter((p) => p.pinned);
  const sogliaNuovi = Date.now() - SETTE_GIORNI_MS;
  const nuoviCandidati = attivi.filter(
    (p) => p.type === "notice" && new Date(p.created_at).getTime() >= sogliaNuovi
  );
  const vistiMiei = await listMyReadPostIds(
    ctx.user.id,
    nuoviCandidati.map((p) => p.id)
  );
  const nuoviPosts = nuoviCandidati.filter((p) => !vistiMiei.has(p.id));
  const pollPosts = attivi.filter((p) => p.type === "poll");
  const pollDettagli = await Promise.all(pollPosts.map((p) => getPoll(p.id)));
  const apertiTutti = pollPosts.filter((_, i) => {
    const poll = pollDettagli[i];
    return poll !== null && poll !== undefined && !isPollClosed(poll);
  });
  const hoVotato = await Promise.all(apertiTutti.map((p) => hasVoted(p.id)));
  const sondaggiAperti = apertiTutti.filter((_, i) => !hoVotato[i]);

  return { allPosts, attivi, evidenzaPosts, nuoviPosts, deadlines, sondaggiAperti };
}
```

- [ ] **Step 2: Chiavi i18n** — in `lib/i18n/it.ts`, sezione `bacheca`, dopo `sottotitolo`:

```ts
    toggleAnnunci: "Annunci",
    toggleCalendario: "Calendario",
```

- [ ] **Step 3: Crea `PannelloBacheca.tsx`** — server component che riprende il markup del pannello oggi in `page.tsx` (saluto, + Pubblica, barra statistiche) e aggiunge il toggle accanto al saluto:

```tsx
// app/(app)/c/[classCode]/PannelloBacheca.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import type { DatiBacheca } from "./bacheca-dati";

/**
 * Pannello riepilogo condiviso tra bacheca (annunci) e calendario:
 * saluto + toggle vista + bottone Pubblica + barra statistiche.
 * I segmenti statistica portano SEMPRE alla bacheca (vista=...).
 */
export function PannelloBacheca({
  classCode,
  nome,
  isRepresentative,
  dati,
  attiva,
}: {
  classCode: string;
  nome: string;
  isRepresentative: boolean;
  dati: DatiBacheca;
  attiva: "annunci" | "calendario";
}) {
  const base = `/c/${classCode}`;
  const stats: Array<{ dot: string; label: string; num: number; href: string | null }> = [
    {
      dot: "bg-avviso",
      label: it.bacheca.statAvvisiNuovi,
      num: dati.nuoviPosts.length,
      href: dati.nuoviPosts.length > 0 ? `${base}?vista=nuovi` : null,
    },
    {
      dot: "bg-scadenza",
      label: it.bacheca.statScadenzeAperte,
      num: dati.deadlines.length,
      href: dati.deadlines.length > 0 ? `${base}?vista=scadenze` : null,
    },
    {
      dot: "bg-sondaggio",
      label: it.bacheca.statSondaggiAperti,
      num: dati.sondaggiAperti.length,
      href:
        dati.sondaggiAperti.length === 1
          ? `${base}/p/${dati.sondaggiAperti[0]!.slug}`
          : dati.sondaggiAperti.length > 1
            ? `${base}?vista=sondaggi`
            : null,
    },
  ];

  const TOGGLE = [
    { key: "annunci", label: it.bacheca.toggleAnnunci, href: base },
    { key: "calendario", label: it.bacheca.toggleCalendario, href: `${base}/calendario` },
  ] as const;

  return (
    <section className="rounded-[22px] border border-hairline bg-paper px-5 pb-1 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold">
            {it.bacheca.saluto.replace("{nome}", nome)}
          </h1>
          <p className="text-[16px] text-ink-soft">{it.bacheca.sottotitolo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-hairline p-1">
            {TOGGLE.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={attiva === t.key ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center rounded-full px-4 text-[16px] font-semibold",
                  attiva === t.key
                    ? "bg-brand text-white"
                    : "text-ink-soft hover:bg-paper-hover hover:text-ink"
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          {isRepresentative && (
            <Link
              href={`${base}/nuovo`}
              className="flex min-h-12 items-center gap-1 whitespace-nowrap rounded-full bg-brand px-5 text-[16px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(91,79,232,0.3)]"
            >
              <Plus className="size-4" aria-hidden /> {it.bacheca.nuovoPost}
            </Link>
          )}
        </div>
      </div>
      <div className="flex overflow-x-auto border-t border-hairline">
        {stats.map((stat) => {
          const contenuto = (
            <>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn("size-[7px] shrink-0 rounded-full", stat.dot)}
                />
                <span className="whitespace-nowrap text-[15px] text-ink-soft">
                  {stat.label}
                </span>
              </span>
              <span className="font-display text-[24px] font-bold">{stat.num}</span>
            </>
          );
          const classi =
            "flex min-w-24 flex-1 flex-col gap-1 border-l border-hairline px-4 py-3.5 first:border-l-0 first:pl-0.5";
          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(classi, "transition-colors hover:bg-paper-hover")}
            >
              {contenuto}
            </Link>
          ) : (
            <div key={stat.label} className={classi}>
              {contenuto}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

NOTA: il toggle usa `min-h-10` dentro un contenitore `p-1`: il target totale resta ≥48px.

- [ ] **Step 4: Rifattorizza `page.tsx` (bacheca)** — sostituisci il fetch + calcolo statistiche con `caricaDatiBacheca`, e il markup del pannello con `<PannelloBacheca ... attiva="annunci" />`. Le VISTE (nuovi/scadenze/sondaggi) e il resto della pagina usano i campi di `dati`. Gli import inutilizzati (getPoll, hasVoted, isPollClosed, listMyReadPostIds, listPosts, listUpcomingDeadlines, Plus se resta solo nell'EmptyState — verificare) vanno ripuliti. La costante `SETTE_GIORNI_MS` esce da page.tsx (vive in bacheca-dati.ts).

- [ ] **Step 5: Verifica**

Run: `corepack pnpm typecheck` → exit 0; `corepack pnpm test` → 30+ passati (21 esistenti + Task 1).
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 200.
Verifica visiva veloce con Denny: bacheca IDENTICA a prima + toggle (il link Calendario darà 404 finché il Task 3 non esiste: atteso, dirlo a Denny).

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/c/[classCode]/bacheca-dati.ts" "app/(app)/c/[classCode]/PannelloBacheca.tsx" "app/(app)/c/[classCode]/page.tsx" lib/i18n/it.ts
git commit -m "Estrai pannello riepilogo e dati bacheca condivisi col toggle vista"
```

---

### Task 3: Pagina calendario — griglia settimana/mese

**Files:**
- Create: `app/(app)/c/[classCode]/calendario/page.tsx`
- Modify: `components/posts/type-style.ts` (campo `dot`)
- Modify: `lib/i18n/it.ts` (sezione `calendario`)

**Interfaces:**
- Consumes: Task 1 (`grigliaMese`, `settimanaDi`, `raggruppaPerGiorno`, `tipoDominante`, `giornoItaliano`, `aggiungiGiorni`, `spostaMese`, `dataValida`), Task 2 (`caricaDatiBacheca`, `PannelloBacheca`), `POST_TYPE_STYLE`.
- Produces: rotta `/c/[classCode]/calendario?vista=&data=&giorno=` (il Task 4 aggiunge l'elenco sotto la griglia in QUESTO stesso file).

- [ ] **Step 1: Aggiungi `dot` a `POST_TYPE_STYLE`** — in `components/posts/type-style.ts` aggiungi al tipo il campo `dot: string;` (commento: «pallino pieno 7px: barra statistiche e celle del calendario») e a ogni voce: notice `dot: "bg-avviso"`, deadline `dot: "bg-scadenza"`, poll `dot: "bg-sondaggio"`, material `dot: "bg-materiale"`.

- [ ] **Step 2: Sezione i18n `calendario`** — in `lib/i18n/it.ts` dopo la sezione `bacheca`:

```ts
  calendario: {
    titolo: "Calendario",
    vistaSettimana: "Settimana",
    vistaMese: "Mese",
    oggi: "Oggi",
    periodoPrec: "Periodo precedente",
    periodoSucc: "Periodo successivo",
    giorniBrevi: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    settimanaDal: "Settimana {dal} – {al}",
    mostraSettimana: "Mostra tutta la settimana",
    mostraMese: "Mostra tutto il mese",
    vuoto: "Niente in calendario in questo periodo.",
    vuotoGiorno: "Niente in questo giorno.",
  },
```

- [ ] **Step 3: Crea la pagina con la griglia** (l'elenco arriva col Task 4):

```tsx
// app/(app)/c/[classCode]/calendario/page.tsx
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { PannelloBacheca } from "../PannelloBacheca";
import { caricaDatiBacheca } from "../bacheca-dati";
import { POST_TYPE_STYLE } from "@/components/posts/type-style";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import {
  aggiungiGiorni,
  dataValida,
  giornoItaliano,
  grigliaMese,
  raggruppaPerGiorno,
  settimanaDi,
  spostaMese,
  tipoDominante,
  type CellaGiorno,
} from "@/lib/calendario/calendario";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";

export const metadata = { title: `${it.calendario.titolo} — ${it.app.name}` };

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ vista?: string; data?: string; giorno?: string }>;
}) {
  const { classCode } = await params;
  const sp = await searchParams;
  const ctx = await requireActiveMembership(classCode);
  const dati = await caricaDatiBacheca(ctx, { includeArchived: false });

  // Stato dall'URL, con default sicuri.
  const vista = sp.vista === "settimana" ? "settimana" : "mese";
  const oggi = giornoItaliano(new Date().toISOString());
  const ancora = dataValida(sp.data) ? sp.data : oggi;
  const selezionato = dataValida(sp.giorno) ? sp.giorno : null;

  const perGiorno = raggruppaPerGiorno(dati.attivi);
  const [anno, mese] = [Number(ancora.slice(0, 4)), Number(ancora.slice(5, 7))];
  const settimane: CellaGiorno[][] =
    vista === "mese"
      ? grigliaMese(anno, mese)
      : [settimanaDi(ancora).map((data) => ({ data, nelMese: true }))];

  const base = `/c/${classCode}/calendario`;
  function url(over: { vista?: string; data?: string; giorno?: string | null }): string {
    const q = new URLSearchParams();
    const v = over.vista ?? vista;
    if (v !== "mese") q.set("vista", v);
    const d = over.data ?? ancora;
    if (d !== oggi) q.set("data", d);
    const g = over.giorno === undefined ? selezionato : over.giorno;
    if (g) q.set("giorno", g);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  }

  const prec = vista === "mese" ? spostaMese(ancora, -1) : aggiungiGiorni(ancora, -7);
  const succ = vista === "mese" ? spostaMese(ancora, 1) : aggiungiGiorni(ancora, 7);

  const titoloPeriodo =
    vista === "mese"
      ? capitalizza(
          new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(
            new Date(`${ancora.slice(0, 7)}-01T12:00:00Z`)
          )
        )
      : it.calendario.settimanaDal
          .replace("{dal}", giornoBreveIt(settimane[0]![0]!.data))
          .replace("{al}", giornoBreveIt(settimane[0]![6]!.data));

  const nome = (ctx.profile?.display_name ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="font-body">
      <PannelloBacheca
        classCode={classCode}
        nome={nome}
        isRepresentative={ctx.isRepresentative}
        dati={dati}
        attiva="calendario"
      />

      {/* Testata del calendario: periodo + navigazione + vista */}
      <div className="mb-4 mt-[26px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={url({ data: prec, giorno: null })}
            aria-label={it.calendario.periodoPrec}
            className="flex size-12 items-center justify-center rounded-full text-ink-soft hover:bg-paper-hover hover:text-ink"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <h2 className="min-w-40 text-center font-display text-[22px] font-bold">
            {titoloPeriodo}
          </h2>
          <Link
            href={url({ data: succ, giorno: null })}
            aria-label={it.calendario.periodoSucc}
            className="flex size-12 items-center justify-center rounded-full text-ink-soft hover:bg-paper-hover hover:text-ink"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
          <Link
            href={url({ data: oggi, giorno: null })}
            className="ml-1 flex min-h-10 items-center rounded-full border border-hairline px-4 text-[15px] font-semibold text-ink-soft hover:border-brand hover:text-ink"
          >
            {it.calendario.oggi}
          </Link>
        </div>
        <div className="flex gap-1 rounded-full border border-hairline p-1">
          {(
            [
              { key: "settimana", label: it.calendario.vistaSettimana },
              { key: "mese", label: it.calendario.vistaMese },
            ] as const
          ).map((v) => (
            <Link
              key={v.key}
              href={url({ vista: v.key, giorno: null })}
              className={cn(
                "flex min-h-10 items-center rounded-full px-4 text-[15px] font-semibold",
                vista === v.key
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:bg-paper-hover hover:text-ink"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Griglia */}
      <div className="rounded-2xl border border-hairline bg-paper p-3">
        <div className="grid grid-cols-7 gap-1">
          {it.calendario.giorniBrevi.map((g) => (
            <span
              key={g}
              className="py-1 text-center text-[15px] font-bold uppercase tracking-[0.03em] text-ink-faint"
            >
              {g}
            </span>
          ))}
          {settimane.flat().map((cella) => {
            const posts = perGiorno.get(cella.data) ?? [];
            const dominante = tipoDominante(posts.map((p) => p.type));
            const stile = dominante ? POST_TYPE_STYLE[dominante] : null;
            const haScadenza = posts.some((p) => p.type === "deadline");
            const haPinnato = posts.some((p) => p.pinned);
            const tipiPresenti = [
              ...new Set(posts.map((p) => p.type)),
            ].map((t) => POST_TYPE_STYLE[t].dot);
            const eSelezionato = cella.data === selezionato;
            const eOggi = cella.data === oggi;
            return (
              <Link
                key={cella.data}
                href={url({ giorno: eSelezionato ? null : cella.data })}
                aria-label={cella.data}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-transparent text-[16px]",
                  vista === "settimana" && "min-h-20",
                  !cella.nelMese && "opacity-40",
                  stile && !eSelezionato && [stile.pinBox, stile.pinText, "font-semibold"],
                  !stile && !eSelezionato && "text-ink hover:bg-paper-hover",
                  haScadenza && !eSelezionato && "border-scadenza",
                  eSelezionato && (stile ? stile.chip : "bg-brand text-white"),
                  eSelezionato && "font-bold",
                  eOggi && "ring-2 ring-brand ring-offset-1"
                )}
              >
                {haPinnato && (
                  <Pin
                    aria-hidden
                    className="absolute right-1 top-1 size-3 text-urgente"
                  />
                )}
                {Number(cella.data.slice(8, 10))}
                {tipiPresenti.length > 0 && (
                  <span aria-hidden className="flex gap-0.5">
                    {tipiPresenti.map((dot) => (
                      <span
                        key={dot}
                        className={cn("size-[7px] rounded-full", dot)}
                      />
                    ))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function capitalizza(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "2026-07-06" → "6 lug" (per il titolo della settimana). */
function giornoBreveIt(ymd: string): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(
    new Date(`${ymd}T12:00:00Z`)
  );
}
```

NOTA sul pin selezionato: quando `eSelezionato` e il dominante è avviso, `stile.chip` include già `text-avviso-ink` (leggibile sul giallo pieno); per gli altri tipi testo bianco.

- [ ] **Step 4: Verifica**

Run: `corepack pnpm typecheck` → exit 0.
Run: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000"` → 200; poi verifica visiva con Denny: `/c/TEST5B/calendario` mostra pannello + griglia colorata; frecce, Oggi, toggle settimana/mese funzionano; URL con `?data=ciao` non rompe (default).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/c/[classCode]/calendario/page.tsx" components/posts/type-style.ts lib/i18n/it.ts
git commit -m "Aggiungi la pagina calendario con griglia settimana e mese"
```

---

### Task 4: Elenco del periodo sotto la griglia

**Files:**
- Modify: `app/(app)/c/[classCode]/calendario/page.tsx`

**Interfaces:**
- Consumes: `PostCard` da `@/components/posts/PostCard`, `EmptyState` da `@/components/shared/EmptyState`, `formatDateIt` da `@/lib/format-date`, tutto già presente nel file dal Task 3.
- Produces: la pagina completa della spec.

- [ ] **Step 1: Aggiungi il calcolo dell'elenco** — nel corpo della pagina, dopo il calcolo di `settimane`:

```tsx
  // Elenco: il giorno selezionato (se cade nel periodo), altrimenti
  // tutto il periodo. Primo blocco scadenze+pinnati, poi il resto,
  // entrambi in ordine di giorno.
  const giorniPeriodo = settimane
    .flat()
    .filter((c) => c.nelMese)
    .map((c) => c.data);
  const giorniElenco =
    selezionato && giorniPeriodo.includes(selezionato) ? [selezionato] : giorniPeriodo;
  const postPeriodo = giorniElenco.flatMap((g) => perGiorno.get(g) ?? []);
  const inEvidenza = postPeriodo.filter((p) => p.type === "deadline" || p.pinned);
  const altri = postPeriodo.filter((p) => !(p.type === "deadline" || p.pinned));
  const titoloElenco =
    giorniElenco.length === 1
      ? capitalizza(
          new Intl.DateTimeFormat("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date(`${giorniElenco[0]}T12:00:00Z`))
        )
      : titoloPeriodo;
```

- [ ] **Step 2: Renderizza l'elenco** — dopo il `</div>` della griglia, prima della chiusura del contenitore:

```tsx
      <div className="mb-4 mt-[26px] flex items-center gap-2.5">
        <span className="whitespace-nowrap text-[15px] font-bold uppercase tracking-[0.07em] text-ink-faint">
          {titoloElenco}
        </span>
        <span aria-hidden className="h-px flex-1 bg-hairline" />
        {giorniElenco.length === 1 && (
          <Link
            href={url({ giorno: null })}
            className="whitespace-nowrap text-[15px] font-semibold text-brand underline underline-offset-4"
          >
            {vista === "mese" ? it.calendario.mostraMese : it.calendario.mostraSettimana}
          </Link>
        )}
      </div>

      {postPeriodo.length === 0 ? (
        <EmptyState
          emoji="🗓️"
          title={
            giorniElenco.length === 1 ? it.calendario.vuotoGiorno : it.calendario.vuoto
          }
          text=""
        />
      ) : (
        <ul className="space-y-2.5">
          {[...inEvidenza, ...altri].map((post) => (
            <li key={post.id}>
              <PostCard post={post} classCode={classCode} />
            </li>
          ))}
        </ul>
      )}
```

Import da aggiungere in testa: `PostCard`, `EmptyState`. Se `EmptyState` richiede `text` non vuoto, passare `it.calendario.vuoto` come text e togliere il title doppio — CONTROLLARE la firma di `components/shared/EmptyState.tsx` e adattare (senza cambiarne il componente).

- [ ] **Step 3: Verifica**

Run: `corepack pnpm typecheck` → exit 0; `corepack pnpm test` → tutti PASS.
Verifica con Denny su TEST5B: mese con post → elenco pieno; click su un giorno → solo quel giorno + link "Mostra tutto il mese"; scadenze e pinnati in cima; giorno vuoto → messaggio gentile.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/c/[classCode]/calendario/page.tsx"
git commit -m "Aggiungi l'elenco del periodo sotto la griglia del calendario"
```

---

### Task 5: Documentazione e test manuale

**Files:**
- Modify: `docs/TEST_PLAN.md` (nuova sezione §17)
- Modify: `docs/ARCHITECTURE.md` (rotta `calendario/` nell'albero cartelle)
- Modify: `docs/ROADMAP.md` (riga vista calendario, spuntata solo DOPO l'e2e)

**Interfaces:** nessuna — solo documenti.

- [ ] **Step 1: TEST_PLAN §17** (in coda al file):

```markdown
## 17. Vista calendario

- [ ] Toggle [Annunci | Calendario] nel pannello, da entrambe le
      pagine; "+ Pubblica" invariato e solo rappresentante.
- [ ] Una scadenza pubblicata oggi con data 20 → compare sul 20, non
      su oggi; la cella del 20 ha il bordo arancio.
- [ ] Giorno con avviso + materiale → cella gialla (dominante avviso)
      con due pallini (giallo e verde).
- [ ] Giorno con post in evidenza → pin rosso nell'angolo della cella.
- [ ] Click su un giorno → sotto compare solo quel giorno con le
      PostCard normali; "Mostra tutto il mese" torna all'insieme.
- [ ] Vista Settimana: 7 celle grandi, frecce ◀ ▶ spostano di 7
      giorni; settimana a cavallo di due mesi corretta.
- [ ] "Oggi" torna al periodo corrente; oggi ha l'anello indaco.
- [ ] URL con valori strani (?data=ciao&vista=boh) → default senza
      errori.
- [ ] Genitore (Laura): vede il calendario coi soli post che vede in
      bacheca; nessun bottone Pubblica.
```

- [ ] **Step 2: ARCHITECTURE.md** — nell'albero cartelle sotto `â”œâ”€â”€ nuovo/` aggiungi la riga `calendario/` con commento «vista calendario settimana/mese (spec 2026-07-12)» rispettando l'indentazione esistente.

- [ ] **Step 3: ROADMAP.md** — dopo la riga del redesign, aggiungi `- [ ] Vista calendario della bacheca (settimana/mese, spec 2026-07-12).` — resterà `[ ]` finché l'e2e §17 non è passato con Denny.

- [ ] **Step 4: Commit**

```bash
git add docs/TEST_PLAN.md docs/ARCHITECTURE.md docs/ROADMAP.md
git commit -m "Documenta la vista calendario nel piano di test e in architettura"
```

---

### Task 6: e2e con Denny e chiusura

- [ ] **Step 1:** Giro manuale TEST_PLAN §17 con Denny su TEST5B (server già acceso; login Denise + Laura in incognito con `node scripts/dev-login.js <email>`).
- [ ] **Step 2:** Spunta le voci §17 passate (con lo strumento Edit, MAI PowerShell sui file di testo) e la riga ROADMAP; commit `Spunta i test e2e della vista calendario`.
- [ ] **Step 3:** Review finale whole-branch del range (dal commit del Task 1 all'ultimo) con subagent code-reviewer; correggere eventuali Critical/Important.
- [ ] **Step 4:** **RICORDA A DENNY: `git push`** (richiesto esplicitamente — task #19 nel task manager; ~75+ commit locali mai pubblicati).
- [ ] **Step 5:** Aggiornare memoria e ledger.
