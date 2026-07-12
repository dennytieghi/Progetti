# Login di rientro + multiclasse (V1.5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porta di rientro `/accedi` (link magico senza creazione account + Accedi con Google), smistamento post-login e pagine `/benvenuto` e `/classi` per il multiclasse (spec: `docs/superpowers/specs/2026-07-12-login-multiclasse-design.md`).

**Architecture:** Si riusa l'infrastruttura esistente: `sendLoginLink` (lib/auth/magic-link.ts) sa già trasportare l'intento `login` e il callback gestisce già `token_hash` e `code`. Si aggiungono: variante "non creare account", smistamento puro post-login, due pagine interne senza vincolo di classe, bottone Google dietro variabile d'ambiente.

**Tech Stack:** Next.js 15 App Router (Server Components + Server Actions), Supabase Auth (@supabase/ssr; per Google serve il primo client BROWSER del progetto), TypeScript strict, vitest per la logica pura.

## Global Constraints

- Testi SOLO in `lib/i18n/it.ts` (ADR-010), italiano informale, errori come frasi complete.
- Server Component di default; client SOLO dove serve interazione (il form email segue il pattern `useActionState` esistente; il bottone Google è client per necessità OAuth).
- Scala font: base 18px, micro-copy ≥15px, titoli card 22px, H1 28px; touch target ≥48px; colori solo dai token del redesign (brand, hairline, ink-faint, paper-hover, ecc.).
- `/accedi` NON crea mai account e risponde in modo NEUTRO (stesso esito visivo per email registrate e non).
- Nessuna modifica a schema DB, RLS o guardie per-classe.
- Comandi: `corepack pnpm typecheck` / `corepack pnpm test` (mai `pnpm` liscio). Dev server già attivo sulla 3000: NON riavviarlo.
- Git root = cartella PADRE (Progetti): stage per path esatto tra virgolette, mai `git add -A`. Commit in italiano, imperativo presente, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- File di testo: solo strumenti Read/Edit/Write, MAI riscritture via PowerShell (corrompe gli accenti).

---

### Task 1: Smistamento post-login (logica pura) + query membership

**Files:**
- Create: `lib/auth/destinazione-login.ts`
- Test: `lib/auth/destinazione-login.test.ts`
- Modify: `lib/db/queries.ts` (nuova query dopo `getMembershipById`)

**Interfaces:**
- Consumes: `MembershipStatus`, `MembershipRow` da `@/lib/db/types`.
- Produces (usati dai Task 3/4):
  - `destinazionePostLogin(memberships: Array<{ status: MembershipStatus; classCode: string }>): string`
  - `listMyMemberships(userId: string): Promise<MembershipRow[]>` in queries.ts

- [ ] **Step 1: Scrivi i test (falliranno)**

```ts
// lib/auth/destinazione-login.test.ts
import { describe, expect, it as test } from "vitest";
import { destinazionePostLogin } from "./destinazione-login";

describe("destinazionePostLogin", () => {
  test("nessuna membership attiva → benvenuto", () => {
    expect(destinazionePostLogin([])).toBe("/benvenuto");
    expect(
      destinazionePostLogin([{ status: "pending", classCode: "AAAAAA" }])
    ).toBe("/benvenuto");
    expect(
      destinazionePostLogin([
        { status: "rejected", classCode: "AAAAAA" },
        { status: "removed", classCode: "BBBBBB" },
      ])
    ).toBe("/benvenuto");
  });
  test("una sola attiva → dritto in bacheca", () => {
    expect(
      destinazionePostLogin([
        { status: "active", classCode: "TEST5B" },
        { status: "pending", classCode: "CCCCCC" },
      ])
    ).toBe("/c/TEST5B");
  });
  test("due o più attive → le mie classi", () => {
    expect(
      destinazionePostLogin([
        { status: "active", classCode: "AAAAAA" },
        { status: "active", classCode: "BBBBBB" },
      ])
    ).toBe("/classi");
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `corepack pnpm vitest run lib/auth/destinazione-login.test.ts`
Expected: FAIL — "Cannot find module './destinazione-login'"

- [ ] **Step 3: Implementa la funzione pura**

```ts
// lib/auth/destinazione-login.ts
import type { MembershipStatus } from "@/lib/db/types";

/**
 * Dove atterra un utente dopo il login di rientro (spec V1.5):
 * 0 classi attive → benvenuto; 1 → la sua bacheca; 2+ → Le mie classi.
 * Le membership pending/rejected/removed non contano: un pending non
 * vede nulla (ADR-011) e trova il suo stato in /classi o /in-attesa.
 */
export function destinazionePostLogin(
  memberships: Array<{ status: MembershipStatus; classCode: string }>
): string {
  const attive = memberships.filter((m) => m.status === "active");
  if (attive.length === 0) return "/benvenuto";
  if (attive.length === 1) return `/c/${attive[0]!.classCode}`;
  return "/classi";
}
```

- [ ] **Step 4: Aggiungi la query in `lib/db/queries.ts`** — subito dopo `getMembershipById` (riga ~86):

```ts
/** Tutte le iscrizioni dell'utente (la RLS mostra sempre le proprie). */
export async function listMyMemberships(userId: string): Promise<MembershipRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });
  return (data as MembershipRow[] | null) ?? [];
}
```

- [ ] **Step 5: Verifica**

Run: `corepack pnpm vitest run lib/auth/destinazione-login.test.ts` → PASS (3).
Run: `corepack pnpm typecheck` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/auth/destinazione-login.ts lib/auth/destinazione-login.test.ts lib/db/queries.ts
git commit -m "Aggiungi lo smistamento post-login e la lista delle proprie iscrizioni"
```

---

### Task 2: `sendLoginLink` senza creazione account + pagina `/accedi` (solo email)

**Files:**
- Modify: `lib/auth/magic-link.ts` (opzione `createUser`)
- Create: `app/(public)/accedi/page.tsx`
- Create: `app/(public)/accedi/actions.ts`
- Create: `app/(public)/accedi/AccediForm.tsx`
- Modify: `app/(public)/page.tsx` (terzo invito in landing)
- Modify: `lib/i18n/it.ts` (sezione `accedi` + CTA landing)
- Modify: `lib/validation/schemas.ts` (schema email)

**Interfaces:**
- Consumes: `sendLoginLink` esistente; pattern form `useActionState` + `initialFormState` (`lib/form-state.ts`); redirect demo `/controlla-email?demo=...` (pattern di `app/(public)/entra/actions.ts:40-51`).
- Produces: `sendLoginLink` accetta `createUser?: boolean` (default `true`); rotta pubblica `/accedi`; `accediSchema` in schemas.ts.

- [ ] **Step 1: Estendi `sendLoginLink`** — in `lib/auth/magic-link.ts`, firma e i due rami:

```ts
export async function sendLoginLink(input: {
  email: string;
  displayName: string;
  intent: LoginIntent;
  /** false = porta di rientro: MAI creare account nuovi (spec V1.5). */
  createUser?: boolean;
}): Promise<{ demoPath: string | null }> {
  const email = input.email.trim().toLowerCase();
  const createUser = input.createUser ?? true;
  const params = intentToParams(input.intent, input.displayName);

  if (DEMO_MODE) {
    const admin = supabaseAdmin();

    if (createUser) {
      // L'utente deve esistere per generare il link; se c'è già va bene così.
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (created.error && created.error.code !== "email_exists") {
        throw new Error(`Creazione utente fallita: ${created.error.message}`);
      }
    }

    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) {
      // Porta di rientro: email sconosciuta → risposta NEUTRA, nessun link.
      if (!createUser) return { demoPath: null };
      throw new Error(`Generazione link fallita: ${link.error.message}`);
    }

    params.set("token_hash", link.data.properties.hashed_token);
    return { demoPath: `/auth/callback?${params.toString()}` };
  }

  // Produzione: email vera. Supabase riporta l'utente sul nostro callback
  // con il codice di verifica; i parametri dell'intento restano nell'URL.
  const baseUrl = await getBaseUrl();
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?${params.toString()}`,
      shouldCreateUser: createUser,
    },
  });
  if (error) {
    // Email sconosciuta sulla porta di rientro: silenzio = neutro.
    if (!createUser) return { demoPath: null };
    throw new Error(`Invio email fallito: ${error.message}`);
  }
  return { demoPath: null };
}
```

(Il resto del file resta identico; aggiorna solo la funzione.)

- [ ] **Step 2: Chiavi i18n** — in `lib/i18n/it.ts`: nella sezione `landing`, dopo `entraSpiega`:

```ts
    accediCta: "Sei già registrato? Accedi",
```

e nuova sezione `accedi` dopo `entra`:

```ts
  accedi: {
    titolo: "Bentornato",
    sottotitolo:
      "Ti mandiamo un nuovo link d'accesso all'email con cui ti sei registrato. Niente password.",
    emailLabel: "La tua email",
    emailEsempio: "Es. giovanni@esempio.it",
    invia: "Mandami il link",
    inviato:
      "Se questa email è registrata, riceve il link tra poco. Controlla anche in spam.",
    linkPersonale: "Il link è personale: non inoltrarlo a nessuno.",
    oppure: "oppure",
    google: "Accedi con Google",
    erroreEmail: "Controlla l'email: sembra scritta in modo non corretto.",
  },
```

- [ ] **Step 3: Schema** — in `lib/validation/schemas.ts` (accanto agli altri schema pubblici):

```ts
export const accediSchema = z.object({
  email: z.string().trim().email({ message: it.accedi.erroreEmail }),
});
```

- [ ] **Step 4: Action** — `app/(public)/accedi/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { sendLoginLink } from "@/lib/auth/magic-link";
import { accediSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Porta di rientro: manda un NUOVO link a chi è già registrato.
 * Mai creare account; esito identico per email registrate e non
 * (anti-enumerazione, spec V1.5).
 */
export async function accediAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = accediSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  const { demoPath } = await sendLoginLink({
    email: parsed.data.email,
    displayName: "",
    intent: { kind: "login" },
    createUser: false,
  });

  redirect(
    demoPath
      ? `/accedi?inviato=1&demo=${encodeURIComponent(demoPath)}`
      : "/accedi?inviato=1"
  );
}
```

- [ ] **Step 5: Form client** — `app/(public)/accedi/AccediForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { accediAction } from "./actions";

export function AccediForm() {
  const [state, formAction] = useActionState(accediAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}
      <div>
        <Label htmlFor="email">{it.accedi.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={it.accedi.emailEsempio}
          required
        />
      </div>
      <SubmitButton size="lg">{it.accedi.invia}</SubmitButton>
    </form>
  );
}
```

- [ ] **Step 6: Pagina** — `app/(public)/accedi/page.tsx`. La pagina nasce con il SOLO form email: niente riferimenti a Google (né import né sezioni vuote) — sarà il Task 5 ad aggiungere divisore e bottone:

```tsx
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/shared/Banner";
import { it } from "@/lib/i18n/it";
import { AccediForm } from "./AccediForm";

export const metadata = { title: `${it.accedi.titolo} — ${it.app.name}` };

/** Porta di rientro per chi è già registrato (spec V1.5). */
export default async function AccediPage({
  searchParams,
}: {
  searchParams: Promise<{ inviato?: string; demo?: string }>;
}) {
  const { inviato, demo } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 font-body">
      <div className="pt-6 text-center">
        <h1 className="font-display text-[28px] font-bold">{it.accedi.titolo}</h1>
        <p className="mt-2 text-ink-soft">{it.accedi.sottotitolo}</p>
      </div>

      {inviato === "1" && (
        <div aria-live="polite" className="space-y-3">
          <Banner tone="success">{it.accedi.inviato}</Banner>
          {demo && demo.startsWith("/auth/callback") && (
            <Card className="space-y-2 border-warning/40 bg-warning-light">
              <p className="text-[15px] font-semibold">
                {it.controllaEmail.demoTitolo}
              </p>
              <p className="text-[15px]">{it.controllaEmail.demoTesto}</p>
              <a
                href={demo}
                className="block break-all text-[15px] font-semibold text-brand underline underline-offset-4"
              >
                {it.controllaEmail.demoBottone}
              </a>
              <p className="text-[15px] text-ink-soft">{it.accedi.linkPersonale}</p>
            </Card>
          )}
        </div>
      )}

      <Card>
        <AccediForm />
      </Card>
    </div>
  );
}
```

NOTA sicurezza: il check `demo.startsWith("/auth/callback")` impedisce di usare il parametro per link arbitrari (open redirect).

- [ ] **Step 7: Landing** — in `app/(public)/page.tsx`, dopo la `</section>` delle due card (riga ~44):

```tsx
      <p className="text-center">
        <Link
          href="/accedi"
          className="text-[16px] font-semibold text-brand underline underline-offset-4"
        >
          {it.landing.accediCta}
        </Link>
      </p>
```

- [ ] **Step 8: Verifica**

Run: `corepack pnpm typecheck` → 0; `corepack pnpm test` → 35/35 (32 + 3 del Task 1).
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/accedi` → 200.
Prova reale (senza browser): invia il form? No — verifica con Denny in e2e. Qui basta che la pagina renda.

- [ ] **Step 9: Commit**

```bash
git add lib/auth/magic-link.ts "app/(public)/accedi/page.tsx" "app/(public)/accedi/actions.ts" "app/(public)/accedi/AccediForm.tsx" "app/(public)/page.tsx" lib/i18n/it.ts lib/validation/schemas.ts
git commit -m "Aggiungi la porta di rientro /accedi col link magico"
```

---

### Task 3: Smistamento nel callback

**Files:**
- Modify: `app/(public)/auth/callback/route.ts`

**Interfaces:**
- Consumes: `destinazionePostLogin` e `listMyMemberships` (Task 1), `getClassById` (esistente, admin).
- Produces: con `intent=login` (o ritorno OAuth senza intent di registrazione) il callback smista 0/1/N.

- [ ] **Step 1: Sostituisci il redirect finale** — in `app/(public)/auth/callback/route.ts`, la riga finale `return NextResponse.redirect(new URL("/account", request.url));` diventa:

```ts
  // Rientro (intent=login, dev-login, ritorno OAuth): smistamento
  // 0 classi → benvenuto, 1 → bacheca, 2+ → Le mie classi (spec V1.5).
  const memberships = await listMyMemberships(user.id);
  const conCodice = await Promise.all(
    memberships.map(async (m) => ({
      status: m.status,
      classCode: (await getClassById(m.class_id))?.class_code ?? "",
    }))
  );
  const dest = destinazionePostLogin(conCodice.filter((m) => m.classCode !== ""));
  return NextResponse.redirect(new URL(dest, request.url));
```

e gli import in testa si estendono:

```ts
import { getClassById, getMembership, listMyMemberships } from "@/lib/db/queries";
import { destinazionePostLogin } from "@/lib/auth/destinazione-login";
```

(NOTA: gli intent `create_class` e `join_class` restano INVARIATI — escono prima con i loro redirect.)

- [ ] **Step 2: Verifica**

Run: `corepack pnpm typecheck` → 0; `corepack pnpm test` → 35/35.
Prova reale: `node scripts/dev-login.js denise.fabbri@simulazione.classehub.test` → apri il link con curl:
`curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "<link>"` → atteso `307 http://localhost:3000/c/TEST5B` (Denise ha UNA classe attiva). Il link si consuma: è il test.

- [ ] **Step 3: Commit**

```bash
git add "app/(public)/auth/callback/route.ts"
git commit -m "Smista il rientro post-login su benvenuto, bacheca o classi"
```

---

### Task 4: Pagine `/benvenuto` e `/classi`

**Files:**
- Create: `app/(app)/benvenuto/page.tsx`
- Create: `app/(app)/classi/page.tsx`
- Modify: `lib/i18n/it.ts` (sezioni `benvenuto` e `classi`)

**Interfaces:**
- Consumes: `getCurrentUser` (require-membership), `listMyMemberships`, `getClassById`, `buttonClasses`, `Card`, `it.header.ruoloRappresentante/ruoloGenitore`.
- Produces: rotte interne `/benvenuto` e `/classi` (fuori da `/c/[classCode]`: serve SOLO la sessione — il layout `(app)` la impone già).

- [ ] **Step 1: i18n** — nuove sezioni dopo `accedi`:

```ts
  benvenuto: {
    titolo: "Non risulti in nessuna classe",
    testo:
      "Questo account non è ancora iscritto a una classe. Puoi entrare con un codice classe o crearne una nuova.",
    googleDiverso:
      "Ti eri già iscritto? Forse con un'altra email: esci e accedi con quella che hai usato per iscriverti.",
    entraCta: "Entra con un codice classe",
    creaCta: "Crea una classe",
  },

  classi: {
    titolo: "Le mie classi",
    sottotitolo: "Scegli la classe che vuoi aprire.",
    inAttesa: "In attesa di approvazione",
    entraAltra: "Entra in un'altra classe",
    creaAltra: "Crea una classe",
  },
```

- [ ] **Step 2: `/benvenuto`** — `app/(app)/benvenuto/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/require-membership";
import { it } from "@/lib/i18n/it";

export const metadata = { title: `${it.benvenuto.titolo} — ${it.app.name}` };

/** Sessione senza classi: le due uscite oneste (spec V1.5). */
export default async function BenvenutoPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/accedi");

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-10 font-body">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-bold">{it.benvenuto.titolo}</h1>
        <p className="mt-2 text-ink-soft">{it.benvenuto.testo}</p>
      </div>
      <Card className="space-y-3">
        <Link href="/entra" className={buttonClasses("primary", "lg")}>
          {it.benvenuto.entraCta}
        </Link>
        <Link href="/crea-classe" className={buttonClasses("secondary", "lg")}>
          {it.benvenuto.creaCta}
        </Link>
      </Card>
      <p className="text-center text-[15px] text-ink-soft">
        {it.benvenuto.googleDiverso}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: `/classi`** — `app/(app)/classi/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/require-membership";
import { getClassById, listMyMemberships } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";

export const metadata = { title: `${it.classi.titolo} — ${it.app.name}` };

/**
 * Le mie classi: una card per iscrizione. I nomi delle classi si
 * leggono con getClassById (admin): un pending non può leggere la
 * riga della classe via RLS, ma il nome della SUA richiesta sì.
 */
export default async function ClassiPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/accedi");

  const memberships = (await listMyMemberships(ctx.user.id)).filter(
    (m) => m.status === "active" || m.status === "pending"
  );
  if (memberships.length === 0) redirect("/benvenuto");

  const cards = await Promise.all(
    memberships.map(async (m) => ({
      membership: m,
      klass: await getClassById(m.class_id),
    }))
  );

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-10 font-body">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-bold">{it.classi.titolo}</h1>
        <p className="mt-2 text-ink-soft">{it.classi.sottotitolo}</p>
      </div>

      <ul className="space-y-2.5">
        {cards.map(({ membership, klass }) => {
          if (!klass) return null;
          const attiva = membership.status === "active";
          const contenuto = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[22px] font-semibold leading-snug">
                  {klass.name}
                </span>
                {!attiva && (
                  <span className="mt-1 flex items-center gap-1.5 text-[15px] text-ink-soft">
                    <Clock className="size-4" aria-hidden /> {it.classi.inAttesa}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[15px] font-semibold",
                  membership.role === "representative"
                    ? "bg-brand text-white"
                    : "bg-paper-hover text-ink-soft"
                )}
              >
                {membership.role === "representative"
                  ? it.header.ruoloRappresentante
                  : it.header.ruoloGenitore}
              </span>
            </>
          );
          return (
            <li key={membership.id}>
              {attiva ? (
                <Link
                  href={`/c/${klass.class_code}`}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_8px_20px_rgba(20,20,30,0.08)]"
                >
                  {contenuto}
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-paper-soft p-5 opacity-80">
                  {contenuto}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/entra" className={buttonClasses("secondary")}>
          {it.classi.entraAltra}
        </Link>
        <Link href="/crea-classe" className={buttonClasses("ghost")}>
          {it.classi.creaAltra}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verifica**

Run: `corepack pnpm typecheck` → 0; `corepack pnpm test` → 35/35.
Prova reale: rigenera il link Denise (`node scripts/dev-login.js ...`) → curl del callback → redirect a `/c/TEST5B` (una classe). Le pagine `/classi` e `/benvenuto` senza sessione via curl → 307 verso `/` (dal layout app) — atteso.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/benvenuto/page.tsx" "app/(app)/classi/page.tsx" lib/i18n/it.ts
git commit -m "Aggiungi le pagine benvenuto e le mie classi"
```

---

### Task 5: Accedi con Google (client browser + bottone + setup con Denny)

**Files:**
- Create: `lib/db/supabase-browser.ts`
- Create: `app/(public)/accedi/GoogleButton.tsx`
- Modify: `app/(public)/accedi/page.tsx` (divisore "oppure" + bottone)
- Modify: `docs/SETUP.md` (sezione Google, testo nel passo 3 qui sotto)

**Interfaces:**
- Consumes: `@supabase/ssr` `createBrowserClient` (pacchetto già installato); env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, nuova `NEXT_PUBLIC_GOOGLE_LOGIN`.
- Produces: bottone Google su `/accedi`, visibile solo con `NEXT_PUBLIC_GOOGLE_LOGIN=1`.

- [ ] **Step 1: Client browser** — `lib/db/supabase-browser.ts` (primo client browser del progetto; SOLO chiave pubblica):

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase per il BROWSER (solo chiave pubblica, mai la secret
 * — CLAUDE.md §7). Serve al giro OAuth di Google: il redirect deve
 * partire dal browser dell'utente.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Bottone** — `app/(public)/accedi/GoogleButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/db/supabase-browser";
import { it } from "@/lib/i18n/it";

/** Parte il giro OAuth: Google → Supabase → il nostro callback. */
export function GoogleButton() {
  const [loading, setLoading] = useState(false);

  async function accediConGoogle() {
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?intent=login`,
      },
    });
    if (error) setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={accediConGoogle}
      disabled={loading}
    >
      {loading ? it.common.caricamento : it.accedi.google}
    </Button>
  );
}
```

- [ ] **Step 3: Integra in pagina + SETUP.md** — in `app/(public)/accedi/page.tsx`, sotto la `<Card>` del form:

```tsx
      {process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1" && (
        <>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-hairline" />
            <span className="text-[15px] text-ink-faint">{it.accedi.oppure}</span>
            <span aria-hidden className="h-px flex-1 bg-hairline" />
          </div>
          <GoogleButton />
        </>
      )}
```

con `import { GoogleButton } from "./GoogleButton";` in testa. In `docs/SETUP.md` aggiungi la sezione:

```markdown
## Accedi con Google (facoltativo)

1. console.cloud.google.com → nuovo progetto "classehub" → "API e
   servizi" → "Schermata consenso OAuth": tipo External, nome app
   ClasseHub, la tua email; scope solo email e profile.
2. "Credenziali" → "Crea credenziali" → "ID client OAuth" → tipo
   "Applicazione web". URI di reindirizzamento autorizzato:
   https://oynywafefntvnkunjieh.supabase.co/auth/v1/callback
3. Supabase → Authentication → Providers → Google: incolla Client ID
   e Client secret, salva.
4. Supabase → Authentication → URL Configuration → "Redirect URLs":
   aggiungi http://localhost:3000/auth/callback
5. In `.env.local`: NEXT_PUBLIC_GOOGLE_LOGIN=1 e riavvia il dev server.
```

- [ ] **Step 4: SETUP GUIDATO CON DENNY (interattivo — fermarsi e farlo insieme)**

Questo passo NON è delegabile a un subagent: il controller guida Denny nei 5 punti di SETUP.md (servono il suo account Google e la dashboard Supabase). Al termine Denny imposta `NEXT_PUBLIC_GOOGLE_LOGIN=1` in `.env.local` e riavvia il dev server (unico caso in cui il riavvio è permesso: le env NEXT_PUBLIC entrano solo al build).

- [ ] **Step 5: Verifica**

Run: `corepack pnpm typecheck` → 0; test → 35/35.
Con Denny (browser): `/accedi` mostra il bottone → click → schermata Google → ritorno sull'app, smistato secondo le sue classi.

- [ ] **Step 6: Commit**

```bash
git add lib/db/supabase-browser.ts "app/(public)/accedi/GoogleButton.tsx" "app/(public)/accedi/page.tsx" docs/SETUP.md
git commit -m "Aggiungi l'accesso con Google dietro variabile d'ambiente"
```

---

### Task 6: Cambio classe dalla sidebar + documentazione

**Files:**
- Modify: `components/shared/AppHeader.tsx` (nome classe → link a /classi, desktop e mobile)
- Modify: `docs/ARCHITECTURE.md` (albero: `accedi/` sotto (public); `benvenuto/` e `classi/` sotto (app); nota flusso login §magic link)
- Modify: `docs/ROADMAP.md` (spunta la voce V1.5 "Accesso per utenti già registrati", aggiungi e spunta "Accedi con Google" e "Le mie classi / multiclasse")
- Modify: `docs/TEST_PLAN.md` (sezione §18 in coda)

**Interfaces:** consuma la rotta `/classi` del Task 4.

- [ ] **Step 1: Sidebar** — in `components/shared/AppHeader.tsx`, desktop: il paragrafo del nome classe diventa link:

```tsx
        <Link
          href="/classi"
          className="mb-6 mt-0.5 block text-[15px] leading-snug text-ink-faint underline-offset-4 hover:text-ink hover:underline"
        >
          {className}
        </Link>
```

e nella barra mobile il blocco del nome classe diventa:

```tsx
        <h1 className="truncate text-[22px] font-bold leading-tight">
          <Link href="/classi" className="underline-offset-4 hover:underline">
            {className}
          </Link>
        </h1>
```

(`Link` è già importato in AppHeader.)

- [ ] **Step 2: TEST_PLAN §18** (in coda al file):

```markdown
## 18. Login di rientro e multiclasse (V1.5)

- [ ] Landing → "Sei già registrato? Accedi" → /accedi.
- [ ] /accedi con email REGISTRATA → banner neutro + riquadro demo col
      link; il link apre la sessione e smista (Denise, 1 classe → la
      sua bacheca).
- [ ] /accedi con email NON registrata → stesso identico banner neutro,
      NESSUN riquadro demo, nessun account creato.
- [ ] Utente in DUE classi attive → il login porta a /classi; le card
      mostrano nome e ruolo giusti; click → bacheca giusta; nella
      classe dove è genitore NON vede i comandi da rappresentante.
- [ ] Membership pending in /classi → card "In attesa di approvazione"
      non cliccabile.
- [ ] Nome classe nella sidebar (e barra mobile) → porta a /classi.
- [ ] Da /classi, "Entra in un'altra classe" con un secondo codice →
      pending creata; "Crea una classe" da utente esistente → funziona.
- [ ] Google con la STESSA email di un'iscrizione → stesse classi.
- [ ] Google con email DIVERSA (mai iscritta) → /benvenuto con la
      spiegazione; nessuna classe visibile.
- [ ] Probe: /accedi?demo=https://evil.example → il riquadro demo NON
      compare (accetta solo percorsi /auth/callback).
```

- [ ] **Step 3: ARCHITECTURE.md e ROADMAP.md** — albero cartelle: aggiungi `accedi/` tra le rotte (public) con commento "porta di rientro (V1.5)", e `benvenuto/` + `classi/` sotto (app) prima di `account/`; nella sezione "Flusso magic link + membership" aggiungi il punto: "Rientro (intent=login o Google): smistamento su benvenuto/bacheca/classi in base alle membership attive". ROADMAP: spunta la riga V1.5 "Accesso per utenti già registrati…" aggiungendo "(fatto 12/7/2026: /accedi + smistamento)", e aggiungi sotto, spuntate: `- [x] Accedi con Google dietro NEXT_PUBLIC_GOOGLE_LOGIN (spec 2026-07-12).` e `- [x] Multiclasse: pagina "Le mie classi", smistamento post-login, cambio classe dalla sidebar.` (spuntarle solo DOPO l'e2e §18: se l'e2e non è ancora passato, lasciarle `[ ]`).

- [ ] **Step 4: Verifica e commit**

Run: `corepack pnpm typecheck` → 0.

```bash
git add components/shared/AppHeader.tsx docs/ARCHITECTURE.md docs/ROADMAP.md docs/TEST_PLAN.md
git commit -m "Collega la sidebar alle mie classi e documenta la V1.5"
```

---

### Task 7: e2e con Denny e chiusura

- [ ] **Step 1:** Preparare i dati per il multiclasse: serve un utente in DUE classi. Creare (via UI con Denny, o script admin usa-e-getta nello scratchpad) una seconda classe di prova e iscrivere Laura o Denise anche lì. Documentare cosa si è creato per la pulizia futura.
- [ ] **Step 2:** Giro manuale TEST_PLAN §18 con Denny (server acceso; il punto Google richiede il setup del Task 5 completato).
- [ ] **Step 3:** Spuntare §18 e le righe ROADMAP (strumento Edit, MAI PowerShell), commit `Spunta i test e2e del login di rientro e multiclasse`.
- [ ] **Step 4:** Review finale whole-branch (dal primo commit del Task 1) con subagent sul modello più capace; fix di Critical/Important; Minor nel ledger.
- [ ] **Step 5:** Aggiornare memoria e ledger; proporre a Denny il `git push`.
