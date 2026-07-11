# Pagamenti semplici — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** coordinate di pagamento del rappresentante visibili in cassa, flusso "genitore dichiara → rappresentante conferma" con metodo di pagamento sul movimento, rimozione completa di Stripe.

**Architecture:** Next.js 15 App Router con Server Actions; Supabase Postgres con RLS; nuova tabella `cash_declarations` (inbox, come le richieste), colonna `method` su `cash_movements`, 4 colonne coordinate su `classes`. Spec: `docs/superpowers/specs/2026-07-11-pagamenti-semplici-design.md`.

**Tech Stack:** TypeScript strict, Tailwind + componenti in `components/ui`, Zod, vitest (da aggiungere) per la logica pura.

## Global Constraints

- Testi SOLO in `lib/i18n/it.ts`, mai hardcoded nei componenti.
- Zod per ogni input di Server Action; ogni action verifica membership **attiva** e `class_id`.
- Query/mutazioni solo via `lib/db/queries.ts` / `lib/db/mutations.ts`.
- Touch target ≥ 48px (`min-h-12`), font ≥ 18px input, copy in seconda persona singolare.
- Commit in italiano, imperativo presente, un cambiamento logico per commit, footer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Radice git = `Progetti`: SEMPRE `git add` con percorsi espliciti, MAI `git add -A`.
- Package manager: `corepack pnpm`. Typecheck: `corepack pnpm typecheck`.
- Metodi di pagamento (enum unico ovunque): `contanti | bonifico | satispay | paypal | altro`.

---

### Task 0: Metti in salvo il lavoro V1.6 già esistente

**Files:** tutti i file modificati/non tracciati della V1.6 (vedi `git status` dentro `Scuola/classehub`).

Il lavoro cassa+modifica post è tutto fuori da git. I file condivisi (`queries.ts`, `mutations.ts`, `types.ts`, `schemas.ts`, `it.ts`) intrecciano i due domini: uno split pulito produrrebbe commit che non compilano da soli. Deroga consapevole alla regola "≥3 domini → dividi": UN commit che fotografa la V1.6 funzionante, PRIMA di iniziare a togliere Stripe.

- [ ] **Step 1: Verifica che compili**

Run: `corepack pnpm typecheck`
Expected: exit 0, nessun errore.

- [ ] **Step 2: Commit unico della V1.6**

```bash
cd C:/Users/Fabrizio/Progetti/Scuola/classehub
git add supabase/migrations/0003_cassa.sql supabase/migrations/0004_modifiche.sql supabase/migrations/0005_cancella_post.sql \
  "app/(app)/c/[classCode]/cassa" "app/(app)/c/[classCode]/p/[postSlug]" "app/(app)/c/[classCode]/page.tsx" \
  lib/cassa lib/euro.ts lib/stripe.ts lib/db/mutations.ts lib/db/queries.ts lib/db/types.ts \
  lib/i18n/it.ts lib/validation/schemas.ts lib/whatsapp/format-message.ts \
  components/shared/AppHeader.tsx docs/ARCHITECTURE.md docs/DECISIONS.md docs/ROADMAP.md docs/SETUP.md \
  package.json pnpm-lock.yaml
git commit -m "Aggiungi V1.6: cassa di classe, modifica ed eliminazione post

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Verifica con `git status`: dentro `Scuola/classehub` non devono restare file modificati (ok file non tracciati di `scripts/simulazione/uscite`).

---

### Task 1: Rimuovi il codice Stripe

**Files:**
- Delete: `lib/stripe.ts`, `app/(app)/c/[classCode]/cassa/VersaOnlineForm.tsx`, `app/(app)/c/[classCode]/cassa/conferma/page.tsx` (e la cartella `conferma/`)
- Modify: `app/(app)/c/[classCode]/cassa/actions.ts`, `app/(app)/c/[classCode]/cassa/page.tsx`, `app/(app)/c/[classCode]/cassa/esporta/route.ts`, `lib/db/mutations.ts`, `lib/validation/schemas.ts`, `lib/i18n/it.ts`, `package.json`

**Interfaces:**
- Produces: cassa senza sezioni carta; `movement.source` non più letto da nessun file (la colonna sparisce nel Task 2).

- [ ] **Step 1: Cancella i file Stripe**

```bash
cd C:/Users/Fabrizio/Progetti/Scuola/classehub
git rm lib/stripe.ts "app/(app)/c/[classCode]/cassa/VersaOnlineForm.tsx"
git rm -r "app/(app)/c/[classCode]/cassa/conferma"
```

- [ ] **Step 2: Pulisci `actions.ts`**

Rimuovi per intero `collegaStripeAction` e `versaOnlineAction` con i loro commenti; rimuovi gli import ora inutili (`stripeClient`, `stripeEnabled`, `getBaseUrl`, `setClassStripeAccount`, `onlineDepositSchema`). In `eliminaMovimentoAction` e `modificaSpesaAction` togli la condizione su `source`:

```ts
// eliminaMovimentoAction: da
if (movement && movement.class_id === ctx.klass.id && movement.source === "manual") {
// a
if (movement && movement.class_id === ctx.klass.id) {

// modificaSpesaAction: da
    movement.kind !== "expense" ||
    movement.source !== "manual"
// a
    movement.kind !== "expense"
```

- [ ] **Step 3: Pulisci `page.tsx` della cassa**

- Togli gli import: `isAccountReady, stripeEnabled` da `@/lib/stripe`, `collegaStripeAction`, `VersaOnlineForm`, `SubmitButton` (se resta inutilizzato), `getBaseUrl` NO (serve al promemoria).
- Togli da `searchParams` le chiavi `pagato`, `annullato`, `stripe` e i relativi `Banner` (righe 122-136). Lascia `errore`.
- Togli il blocco `stripeOn`/`stripeReady` (righe 57-62) e le due Card "Versa con carta" (166-174) e "collegamento Stripe" (177-196).
- In `MovementCard`: togli `` {movement.source === "stripe" ? ` · ${it.cassa.conCarta}` : ""} `` e cambia `{isRepresentative && movement.source === "manual" && (` in `{isRepresentative && (`.

- [ ] **Step 4: Pulisci `mutations.ts`, `schemas.ts`, `i18n/it.ts`**

- `mutations.ts`: rimuovi `recordStripeDeposit` e `setClassStripeAccount` (interi, con i commenti).
- `schemas.ts`: rimuovi `onlineDepositSchema`.
- `it.ts` sezione `cassa`: rimuovi le chiavi `conCarta`, `stripeTitolo`, `stripeCollegaSpiega`, `stripeCollega`, `stripeCollegato`, `stripeNonPronto`, `stripeErrore`, `versaOnlineTitolo`, `versaOnlineSpiega`, `versaOnlineBottone`, `versaOnlineCausale`, `pagamentoRiuscito`, `pagamentoAnnullato`. TIENI `pagamentoErrore` rinominandolo? No: rimuovi anche `pagamentoErrore` e il Banner `errore` che lo usa in page.tsx (era solo per il ritorno da Stripe).
- Nell'`esporta/route.ts`: cambia `movement.source === "stripe" ? it.cassa.csvCarta : it.cassa.csvContanti` in `it.cassa.csvContanti` (temporaneo: il Task 8 mette il metodo vero). Rimuovi `csvCarta` da `it.ts`.

- [ ] **Step 5: Togli la dipendenza**

```bash
corepack pnpm remove stripe
```

- [ ] **Step 6: Typecheck**

Run: `corepack pnpm typecheck`
Expected: exit 0. Se segnala `source`/`stripe_session_id` inutilizzati nei types va bene: la colonna esiste ancora nel DB, i types si aggiornano nel Task 2.

- [ ] **Step 7: Commit**

```bash
git add lib/stripe.ts "app/(app)/c/[classCode]/cassa" lib/db/mutations.ts lib/validation/schemas.ts lib/i18n/it.ts package.json pnpm-lock.yaml
git commit -m "Rimuovi l'integrazione Stripe dalla cassa

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Migrazione 0006 + types

**Files:**
- Create: `supabase/migrations/0006_pagamenti_semplici.sql`
- Modify: `lib/db/types.ts`, `lib/db/mutations.ts` (funzione privata `insertMovementWithShares`)

**Interfaces:**
- Produces (per tutti i task successivi):
  - `PaymentMethod = "contanti" | "bonifico" | "satispay" | "paypal" | "altro"`
  - `CashMovementRow.method: PaymentMethod` (via `source` e `stripe_session_id`)
  - `ClassRow.payment_iban | payment_iban_holder | payment_paypal | payment_satispay: string | null` (via `stripe_account_id`)
  - `CashDeclarationRow` e `DeclarationStatus = "pending" | "confirmed" | "rejected"`
  - `insertMovementWithShares` accetta `method: PaymentMethod`

- [ ] **Step 1: Scrivi la migrazione**

```sql
-- ============================================================
-- ClasseHub — Pagamenti semplici (migrazione 0006)
-- Via Stripe; il rappresentante pubblica le SUE coordinate e i
-- genitori pagano fuori dall'app. Il genitore dichiara il
-- versamento; la cassa si aggiorna solo alla conferma.
-- ============================================================

-- Coordinate di pagamento della classe (tutte facoltative).
alter table classes
  add column payment_iban text,
  add column payment_iban_holder text,
  add column payment_paypal text,
  add column payment_satispay text;
alter table classes drop column stripe_account_id;

-- Metodo di pagamento sul movimento; via i resti di Stripe.
-- Le policy che citavano source vanno ricreate senza.
drop policy cash_movements_insert_rep on cash_movements;
drop policy cash_movements_delete_rep on cash_movements;
alter table cash_movements drop column source;
alter table cash_movements drop column stripe_session_id;
alter table cash_movements add column method text not null default 'contanti'
  check (method in ('contanti','bonifico','satispay','paypal','altro'));

create policy cash_movements_insert_rep on cash_movements
  for insert with check (is_representative(class_id) and created_by = auth.uid());
create policy cash_movements_delete_rep on cash_movements
  for delete using (is_representative(class_id));

-- ------------------------------------------------- DICHIARAZIONI
-- Il genitore segnala "ho versato"; niente entra nei saldi finché
-- il rappresentante non conferma (la conferma crea il movimento).
create table cash_declarations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  amount_cents int not null check (amount_cents > 0),
  method text not null check (method in ('contanti','bonifico','satispay','paypal','altro')),
  note text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  movement_id uuid references cash_movements(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index on cash_declarations (class_id, status, created_at desc);
create index on cash_declarations (user_id);

alter table cash_declarations enable row level security;

-- Il genitore vede solo le proprie; il rappresentante tutte.
create policy cash_declarations_select_own on cash_declarations
  for select using (user_id = auth.uid());
create policy cash_declarations_select_rep on cash_declarations
  for select using (is_representative(class_id));

-- Solo un membro ATTIVO dichiara, solo a proprio nome, solo pending.
create policy cash_declarations_insert_own on cash_declarations
  for insert with check (
    is_active_member(class_id)
    and user_id = auth.uid()
    and status = 'pending'
    and movement_id is null
    and decided_at is null
  );

-- Decide solo il rappresentante. Niente delete: le rifiutate restano.
create policy cash_declarations_update_rep on cash_declarations
  for update using (is_representative(class_id));
```

- [ ] **Step 2: FERMATI — migrazioni sul database (le esegue Denny)**

Denny incolla nell'SQL Editor di Supabase, in quest'ordine: **prima `0005_cancella_post.sql`** (non ancora applicata, vedi ROADMAP), **poi `0006_pagamenti_semplici.sql`**. Verifica dal terminale (con la chiave admin, stessa tecnica dei controlli precedenti): `select` su `cash_declarations` risponde 200 e `classes.payment_iban` esiste.

- [ ] **Step 3: Aggiorna `lib/db/types.ts`**

```ts
// In ClassRow: al posto di stripe_account_id
  /** Coordinate di pagamento del rappresentante (null = non inserita). */
  payment_iban: string | null;
  payment_iban_holder: string | null;
  payment_paypal: string | null;
  payment_satispay: string | null;

// Al posto di CashMovementSource:
export type PaymentMethod = "contanti" | "bonifico" | "satispay" | "paypal" | "altro";

// In CashMovementRow: via source e stripe_session_id, dentro:
  method: PaymentMethod;

// Dopo CashShareRow:
export type DeclarationStatus = "pending" | "confirmed" | "rejected";

/** Versamento segnalato da un genitore, in attesa del rappresentante. */
export interface CashDeclarationRow {
  id: string;
  class_id: string;
  user_id: string;
  amount_cents: number;
  method: PaymentMethod;
  note: string | null;
  status: DeclarationStatus;
  movement_id: string | null;
  created_at: string;
  decided_at: string | null;
}
```

- [ ] **Step 4: Passa il metodo in `insertMovementWithShares`**

In `lib/db/mutations.ts` la funzione privata `insertMovementWithShares` guadagna `method: PaymentMethod` nell'input e lo include nell'insert (`method: input.method`). `recordCashDeposit` e `recordCashExpense` guadagnano `method: PaymentMethod` e lo passano; le spese del rappresentante usano il metodo scelto nel form (Task 8) — per ora chi le chiama passa `"contanti"`. Aggiorna le chiamate in `app/(app)/c/[classCode]/cassa/actions.ts` aggiungendo `method: "contanti"` (temporaneo fino al Task 8).

- [ ] **Step 5: Typecheck**

Run: `corepack pnpm typecheck`
Expected: exit 0 (l'`esporta/route.ts` non usa più `source` dal Task 1).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0006_pagamenti_semplici.sql lib/db/types.ts lib/db/mutations.ts "app/(app)/c/[classCode]/cassa/actions.ts"
git commit -m "Aggiungi migrazione pagamenti semplici: coordinate, metodo, dichiarazioni

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Validatori coordinate (TDD con vitest)

**Files:**
- Create: `lib/validation/pagamento.ts`, `lib/validation/pagamento.test.ts`, `vitest.config.ts`
- Modify: `package.json` (devDependency + script)

**Interfaces:**
- Produces:
  - `normalizzaIban(input: string): string | null` — spazi via, maiuscolo; valido solo IT a 27 caratteri (`IT` + 2 cifre + 1 lettera + 10 cifre + 12 alfanumerici); null se non valido.
  - `normalizzaLinkPaypal(input: string): string | null` — accetta `paypal.me/nome`, `www.paypal.me/nome`, `https://paypal.me/nome`; ritorna sempre `https://paypal.me/nome`.
  - `normalizzaTelefono(input: string): string | null` — cellulare italiano (inizia per 3, 9-10 cifre, prefisso +39 opzionale); ritorna `+39...`.

- [ ] **Step 1: Aggiungi vitest**

```bash
corepack pnpm add -D vitest
```

In `package.json` scripts: `"test": "vitest run"`.

Crea `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { include: ["lib/**/*.test.ts"] },
});
```

- [ ] **Step 2: Scrivi i test (devono fallire)**

`lib/validation/pagamento.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizzaIban, normalizzaLinkPaypal, normalizzaTelefono } from "./pagamento";

describe("normalizzaIban", () => {
  it("accetta un IBAN italiano con spazi e minuscole", () => {
    expect(normalizzaIban("it60 x054 2811 1010 0000 0123 456")).toBe(
      "IT60X0542811101000000123456"
    );
  });
  it("rifiuta IBAN esteri, corti o con caratteri strani", () => {
    expect(normalizzaIban("DE89370400440532013000")).toBeNull();
    expect(normalizzaIban("IT60X05428111010000001234")).toBeNull();
    expect(normalizzaIban("IT60X05428111010000001234!!")).toBeNull();
    expect(normalizzaIban("")).toBeNull();
  });
});

describe("normalizzaLinkPaypal", () => {
  it("porta ogni variante alla forma canonica", () => {
    expect(normalizzaLinkPaypal("paypal.me/denise")).toBe("https://paypal.me/denise");
    expect(normalizzaLinkPaypal("https://www.paypal.me/denise/")).toBe(
      "https://paypal.me/denise"
    );
  });
  it("rifiuta link che non sono paypal.me", () => {
    expect(normalizzaLinkPaypal("https://evil.com/paypal.me/denise")).toBeNull();
    expect(normalizzaLinkPaypal("paypal.com/denise")).toBeNull();
    expect(normalizzaLinkPaypal("denise")).toBeNull();
  });
});

describe("normalizzaTelefono", () => {
  it("accetta cellulari italiani con o senza prefisso e spazi", () => {
    expect(normalizzaTelefono("333 123 4567")).toBe("+393331234567");
    expect(normalizzaTelefono("+39 333 1234567")).toBe("+393331234567");
  });
  it("rifiuta numeri non cellulari o troppo corti", () => {
    expect(normalizzaTelefono("0511234567")).toBeNull();
    expect(normalizzaTelefono("333123")).toBeNull();
  });
});
```

- [ ] **Step 3: Verifica che falliscano**

Run: `corepack pnpm test`
Expected: FAIL — `Cannot find module './pagamento'` (o simili).

- [ ] **Step 4: Implementa**

`lib/validation/pagamento.ts`:

```ts
/**
 * Normalizzazione delle coordinate di pagamento del rappresentante.
 * Logica pura: ritorna la forma canonica, o null se il valore non
 * è accettabile (il messaggio d'errore lo mette lo schema Zod).
 */

/** IBAN italiano: IT + 2 cifre controllo + CIN + ABI/CAB + conto. */
export function normalizzaIban(input: string): string | null {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  return /^IT\d{2}[A-Z]\d{10}[0-9A-Z]{12}$/.test(iban) ? iban : null;
}

/** Solo link paypal.me: qualunque altra cosa è rifiutata. */
export function normalizzaLinkPaypal(input: string): string | null {
  const s = input.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const m = s.match(/^paypal\.me\/([A-Za-z0-9]{1,50})\/?$/i);
  return m ? `https://paypal.me/${m[1]}` : null;
}

/** Cellulare italiano (Satispay è legato al numero di telefono). */
export function normalizzaTelefono(input: string): string | null {
  const t = input.replace(/[\s.\-/]/g, "");
  const m = t.match(/^(?:\+39)?(3\d{8,9})$/);
  return m ? `+39${m[1]}` : null;
}
```

- [ ] **Step 5: Verifica che passino**

Run: `corepack pnpm test`
Expected: PASS, 6 test verdi.

- [ ] **Step 6: Commit**

```bash
git add lib/validation/pagamento.ts lib/validation/pagamento.test.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "Aggiungi validatori coordinate di pagamento con vitest

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Coordinate di pagamento nelle impostazioni

**Files:**
- Create: `app/(app)/c/[classCode]/impostazioni/actions.ts`, `app/(app)/c/[classCode]/impostazioni/PagamentiForm.tsx`
- Modify: `app/(app)/c/[classCode]/impostazioni/page.tsx`, `lib/db/mutations.ts`, `lib/validation/schemas.ts`, `lib/i18n/it.ts`

**Interfaces:**
- Consumes: `normalizzaIban/LinkPaypal/Telefono` (Task 3); `ClassRow.payment_*` (Task 2).
- Produces: `paymentCoordsSchema` (Zod), `updateClassPaymentInfo(classId, coords)` in mutations, action `salvaCoordinatePagamentoAction`.

- [ ] **Step 1: Chiavi i18n** (`it.ts`, nuova sotto-sezione dentro `impostazioni`)

```ts
    pagamentiTitolo: "Coordinate di pagamento",
    pagamentiSpiega:
      "Come i genitori possono farti avere i soldi della cassa. Compila solo quello che usi: comparirà nella pagina Cassa di ogni genitore.",
    ibanLabel: "IBAN (facoltativo)",
    ibanEsempio: "Es. IT60 X054 2811 1010 0000 0123 456",
    intestatarioLabel: "Conto intestato a (facoltativo)",
    intestatarioEsempio: "Es. Denise Fabbri",
    paypalLabel: "Link PayPal (facoltativo)",
    paypalEsempio: "Es. paypal.me/denisefabbri",
    satispayLabel: "Numero Satispay (facoltativo)",
    satispayEsempio: "Es. 333 1234567",
    pagamentiSalva: "Salva le coordinate",
    pagamentiSalvate: "Coordinate salvate. I genitori le vedono nella pagina Cassa.",
    erroreIban:
      "L'IBAN non sembra giusto: deve iniziare con IT ed essere lungo 27 caratteri. Controlla e riprova.",
    errorePaypal:
      "Il link PayPal deve essere del tipo paypal.me/tuonome. Lo trovi nell'app PayPal sotto \"Ricevi denaro\".",
    erroreTelefonoSatispay:
      "Il numero non sembra un cellulare italiano. Scrivilo come 333 1234567.",
```

- [ ] **Step 2: Schema Zod** (`schemas.ts`)

```ts
import {
  normalizzaIban,
  normalizzaLinkPaypal,
  normalizzaTelefono,
} from "@/lib/validation/pagamento";

/** Campo facoltativo: vuoto → null, altrimenti normalizza o errore. */
function coordSchema(normalizza: (s: string) => string | null, message: string) {
  return z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s.length === 0) return null;
      const v = normalizza(s);
      if (v === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
      return v;
    });
}

export const paymentCoordsSchema = z.object({
  iban: coordSchema(normalizzaIban, it.impostazioni.erroreIban),
  ibanHolder: z
    .string()
    .trim()
    .max(80)
    .transform((s) => (s.length > 0 ? s : null)),
  paypal: coordSchema(normalizzaLinkPaypal, it.impostazioni.errorePaypal),
  satispay: coordSchema(normalizzaTelefono, it.impostazioni.erroreTelefonoSatispay),
});
```

- [ ] **Step 3: Mutation** (`mutations.ts`)

```ts
/** Coordinate di pagamento della classe (solo rappresentante, via RLS update classes? NO:
 *  classes non ha policy update client → ADMIN, dopo la guardia requireRepresentative). */
export async function updateClassPaymentInfo(
  classId: string,
  coords: {
    iban: string | null;
    ibanHolder: string | null;
    paypal: string | null;
    satispay: string | null;
  }
): Promise<void> {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("classes")
    .update({
      payment_iban: coords.iban,
      payment_iban_holder: coords.ibanHolder,
      payment_paypal: coords.paypal,
      payment_satispay: coords.satispay,
    })
    .eq("id", classId);
  if (error) throw new Error(`Salvataggio coordinate fallito: ${error.message}`);
}
```

(Stesso pattern ADMIN di `setClassStripeAccount` rimosso: la colonna non ha policy client e la guardia `requireRepresentative` sta nell'action.)

- [ ] **Step 4: Action** (`impostazioni/actions.ts`, nuovo file)

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { updateClassPaymentInfo } from "@/lib/db/mutations";
import { paymentCoordsSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

export async function salvaCoordinatePagamentoAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = typeof formData.get("classCode") === "string"
    ? (formData.get("classCode") as string)
    : "";
  const ctx = await requireRepresentative(classCode);

  const parsed = paymentCoordsSchema.safeParse({
    iban: formData.get("iban"),
    ibanHolder: formData.get("ibanHolder"),
    paypal: formData.get("paypal"),
    satispay: formData.get("satispay"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  await updateClassPaymentInfo(ctx.klass.id, parsed.data);
  revalidatePath(`/c/${classCode}/impostazioni`);
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/impostazioni?pagamenti=1`);
}
```

- [ ] **Step 5: Form client** (`impostazioni/PagamentiForm.tsx`, nuovo file — stesso stile di `VersamentoForm`)

```tsx
"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { salvaCoordinatePagamentoAction } from "./actions";

export interface CoordsDefaults {
  iban: string;
  ibanHolder: string;
  paypal: string;
  satispay: string;
}

export function PagamentiForm({
  classCode,
  defaults,
}: {
  classCode: string;
  defaults: CoordsDefaults;
}) {
  const [state, formAction] = useActionState(
    salvaCoordinatePagamentoAction,
    initialFormState
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}
      <input type="hidden" name="classCode" value={classCode} />
      <div>
        <Label htmlFor="iban">{it.impostazioni.ibanLabel}</Label>
        <Input id="iban" name="iban" placeholder={it.impostazioni.ibanEsempio} defaultValue={defaults.iban} />
      </div>
      <div>
        <Label htmlFor="ibanHolder">{it.impostazioni.intestatarioLabel}</Label>
        <Input id="ibanHolder" name="ibanHolder" placeholder={it.impostazioni.intestatarioEsempio} maxLength={80} defaultValue={defaults.ibanHolder} />
      </div>
      <div>
        <Label htmlFor="paypal">{it.impostazioni.paypalLabel}</Label>
        <Input id="paypal" name="paypal" placeholder={it.impostazioni.paypalEsempio} defaultValue={defaults.paypal} />
      </div>
      <div>
        <Label htmlFor="satispay">{it.impostazioni.satispayLabel}</Label>
        <Input id="satispay" name="satispay" inputMode="tel" placeholder={it.impostazioni.satispayEsempio} defaultValue={defaults.satispay} />
      </div>
      <SubmitButton>{it.impostazioni.pagamentiSalva}</SubmitButton>
    </form>
  );
}
```

- [ ] **Step 6: Sezione nella pagina impostazioni**

In `impostazioni/page.tsx`: aggiungi `searchParams: Promise<{ pagamenti?: string }>` alla firma, il Banner di conferma (`{pagamenti === "1" && <Banner tone="success">{it.impostazioni.pagamentiSalvate}</Banner>}` sotto il titolo, in un div `aria-live="polite"`), e una Card in fondo (dopo la `<nav>`):

```tsx
      <Card className="space-y-3">
        <h2 className="text-[19px] font-bold">{it.impostazioni.pagamentiTitolo}</h2>
        <p className="text-[15px] text-ink-soft">{it.impostazioni.pagamentiSpiega}</p>
        <PagamentiForm
          classCode={classCode}
          defaults={{
            iban: ctx.klass.payment_iban ?? "",
            ibanHolder: ctx.klass.payment_iban_holder ?? "",
            paypal: ctx.klass.payment_paypal ?? "",
            satispay: ctx.klass.payment_satispay ?? "",
          }}
        />
      </Card>
```

Import: `Banner`, `PagamentiForm`.

- [ ] **Step 7: Verifica manuale**

Run: `corepack pnpm typecheck` → exit 0. Poi nel browser (server dev già attivo): come Denise → Impostazioni → compila IBAN `IT60 X054 2811 1010 0000 0123 456` e Satispay `333 1234567` → "Coordinate salvate". Prova un IBAN sbagliato (`IT60X0`) → errore in frase completa. Ricarica: i campi ripropongono i valori salvati.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/c/[classCode]/impostazioni" lib/db/mutations.ts lib/validation/schemas.ts lib/i18n/it.ts
git commit -m "Aggiungi coordinate di pagamento nelle impostazioni

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Riquadro "Come pagare" in cassa + promemoria WhatsApp con coordinate

**Files:**
- Create: `app/(app)/c/[classCode]/cassa/ComePagareBox.tsx`
- Modify: `app/(app)/c/[classCode]/cassa/page.tsx`, `lib/whatsapp/format-message.ts`, `lib/i18n/it.ts`
- Test: aggiorna a mano la verifica; per `format-message` aggiungi `lib/whatsapp/format-message.test.ts`

**Interfaces:**
- Consumes: `ClassRow.payment_*`; `CopyButton` esistente (`components/shared/CopyButton.tsx`).
- Produces: `formatCassaReminderForWhatsapp` accetta `coords: { iban, ibanHolder, paypal, satispay } | null` (tutte `string | null`).

- [ ] **Step 1: Chiavi i18n** (sezione `cassa`)

```ts
    comePagareTitolo: "Come pagare",
    comePagareSpiega:
      "Paga col metodo che preferisci, poi segnala il versamento qui sotto: comparirà in cassa quando il rappresentante lo conferma.",
    comePagareIntestato: "intestato a",
    comePagareApriPaypal: "Apri PayPal",
    comePagareMancaRep:
      "Non hai ancora inserito le tue coordinate di pagamento: i genitori non sanno dove mandarti i soldi.",
    comePagareImposta: "Inserisci le coordinate",
    waPagaCosi: "Puoi pagare così:",
```

- [ ] **Step 2: Componente `ComePagareBox.tsx`** (server component, nessun `"use client"`)

```tsx
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/shared/CopyButton";
import { buttonClasses } from "@/components/ui/Button";
import { it } from "@/lib/i18n/it";
import type { ClassRow } from "@/lib/db/types";

/**
 * Le coordinate del rappresentante, pronte da copiare. Compare solo
 * ciò che è compilato; se non c'è nulla il chiamante non renderizza.
 */
export function ComePagareBox({ klass }: { klass: ClassRow }) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-[19px] font-bold">{it.cassa.comePagareTitolo}</h2>
        <p className="mt-1 text-[15px] text-ink-soft">{it.cassa.comePagareSpiega}</p>
      </div>
      <ul className="space-y-3">
        {klass.payment_iban && (
          <li className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold text-ink-soft">
                {it.impostazioni.ibanLabel.replace(" (facoltativo)", "")}
                {klass.payment_iban_holder
                  ? ` — ${it.cassa.comePagareIntestato} ${klass.payment_iban_holder}`
                  : ""}
              </p>
              <p className="break-all text-[17px] font-semibold">{klass.payment_iban}</p>
            </div>
            <CopyButton text={klass.payment_iban} />
          </li>
        )}
        {klass.payment_paypal && (
          <li className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[17px] font-semibold">PayPal</p>
            <a
              href={klass.payment_paypal}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary")}
            >
              {it.cassa.comePagareApriPaypal}
            </a>
          </li>
        )}
        {klass.payment_satispay && (
          <li className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold text-ink-soft">Satispay</p>
              <p className="text-[17px] font-semibold">{klass.payment_satispay}</p>
            </div>
            <CopyButton text={klass.payment_satispay} />
          </li>
        )}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 3: Montalo nella pagina cassa**

In `page.tsx`, subito dopo il blocco quota/saldo:

```tsx
      {haCoordinate && !ctx.isRepresentative && <ComePagareBox klass={ctx.klass} />}
      {ctx.isRepresentative && !haCoordinate && (
        <Card className="space-y-3">
          <p className="text-[15px] text-ink-soft">{it.cassa.comePagareMancaRep}</p>
          <Link
            href={`/c/${classCode}/impostazioni`}
            className={buttonClasses("secondary")}
          >
            {it.cassa.comePagareImposta}
          </Link>
        </Card>
      )}
```

con, sopra il return:

```tsx
  const haCoordinate = Boolean(
    ctx.klass.payment_iban || ctx.klass.payment_paypal || ctx.klass.payment_satispay
  );
```

- [ ] **Step 4: Promemoria WhatsApp con coordinate (prima il test)**

`lib/whatsapp/format-message.test.ts`:

```ts
import { describe, expect, it as test } from "vitest";
import { formatCassaReminderForWhatsapp } from "./format-message";

describe("formatCassaReminderForWhatsapp", () => {
  test("senza coordinate: solo invito e link", () => {
    const msg = formatCassaReminderForWhatsapp({
      classCode: "ABC123",
      baseUrl: "https://classehub.app",
      coords: null,
    });
    expect(msg).toContain("https://classehub.app/c/ABC123/cassa");
    expect(msg).not.toContain("IBAN");
  });
  test("con coordinate: elenca solo quelle compilate", () => {
    const msg = formatCassaReminderForWhatsapp({
      classCode: "ABC123",
      baseUrl: "https://classehub.app",
      coords: {
        iban: "IT60X0542811101000000123456",
        ibanHolder: "Denise Fabbri",
        paypal: null,
        satispay: "+393331234567",
      },
    });
    expect(msg).toContain("IT60X0542811101000000123456");
    expect(msg).toContain("Denise Fabbri");
    expect(msg).toContain("+393331234567");
    expect(msg).not.toContain("paypal.me");
  });
});
```

Run: `corepack pnpm test` → FAIL (firma senza `coords`).

Implementazione in `format-message.ts` (sostituisce la funzione esistente):

```ts
export function formatCassaReminderForWhatsapp(input: {
  classCode: string;
  baseUrl: string;
  coords: {
    iban: string | null;
    ibanHolder: string | null;
    paypal: string | null;
    satispay: string | null;
  } | null;
}): string {
  const url = `${input.baseUrl}/c/${input.classCode}/cassa`;
  const lines = [`💰 ${it.cassa.waTitolo} — ${it.cassa.waServono}`, it.cassa.waTesto];

  const c = input.coords;
  if (c && (c.iban || c.paypal || c.satispay)) {
    lines.push(it.cassa.waPagaCosi);
    if (c.iban) {
      lines.push(
        `🏦 IBAN: ${c.iban}${c.ibanHolder ? ` (${it.cassa.comePagareIntestato} ${c.ibanHolder})` : ""}`
      );
    }
    if (c.paypal) lines.push(`💳 PayPal: ${c.paypal}`);
    if (c.satispay) lines.push(`📱 Satispay: ${c.satispay}`);
  }

  lines.push(it.cassa.waLink, `👉 ${url}`);
  return lines.join("\n");
}
```

In `page.tsx` il chiamante diventa:

```tsx
  const promemoriaWhatsapp = ctx.isRepresentative
    ? formatCassaReminderForWhatsapp({
        classCode: ctx.klass.class_code,
        baseUrl: await getBaseUrl(),
        coords: {
          iban: ctx.klass.payment_iban,
          ibanHolder: ctx.klass.payment_iban_holder,
          paypal: ctx.klass.payment_paypal,
          satispay: ctx.klass.payment_satispay,
        },
      })
    : null;
```

Aggiorna anche `it.cassa.waTesto` (il testo cita ancora la carta):

```ts
    waTesto:
      "Apri il link, controlla la tua quota e, se puoi, fai un versamento col metodo che preferisci.",
```

- [ ] **Step 5: Verifica**

Run: `corepack pnpm test` → PASS. `corepack pnpm typecheck` → exit 0.
Browser: come genitore (es. `laura.bianchi@simulazione.classehub.test` via `node scripts/dev-login.js`) → Cassa → riquadro "Come pagare" con IBAN copiabile. Come Denise → il promemoria WhatsApp contiene le coordinate.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/c/[classCode]/cassa" lib/whatsapp lib/i18n/it.ts
git commit -m "Mostra le coordinate di pagamento in cassa e nel promemoria WhatsApp

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Strato dati delle dichiarazioni

**Files:**
- Modify: `lib/db/queries.ts`, `lib/db/mutations.ts`

**Interfaces:**
- Consumes: `CashDeclarationRow`, `PaymentMethod` (Task 2).
- Produces (usate dai Task 7-8):
  - `listPendingDeclarations(classId): Promise<CashDeclarationRow[]>` — RLS: piene solo per il rappresentante.
  - `listMyDeclarations(classId, userId): Promise<CashDeclarationRow[]>` — pending + rifiutate degli ultimi 30 giorni, recenti prima.
  - `countPendingDeclarationsByUser(classId, userId): Promise<number>`
  - `getCashDeclarationById(id): Promise<CashDeclarationRow | null>`
  - `insertCashDeclaration({ classId, userId, amountCents, method, note }): Promise<void>`
  - `confirmCashDeclaration({ declarationId, classId, representativeId, parentId, amountCents, method, title }): Promise<void>` — crea movimento+quota via `insertMovementWithShares`, poi marca la dichiarazione `confirmed` con `movement_id` e `decided_at`.
  - `rejectCashDeclaration(declarationId): Promise<void>` — `pending` → `rejected` + `decided_at`.

- [ ] **Step 1: Query** (in `queries.ts`, dopo le query cassa esistenti)

```ts
/** Dichiarazioni in attesa (il rappresentante le vede tutte via RLS). */
export async function listPendingDeclarations(
  classId: string
): Promise<CashDeclarationRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("cash_declarations")
    .select("*")
    .eq("class_id", classId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return (data as CashDeclarationRow[] | null) ?? [];
}

/** Le dichiarazioni del genitore: in attesa + rifiutate recenti. */
export async function listMyDeclarations(
  classId: string,
  userId: string
): Promise<CashDeclarationRow[]> {
  const supabase = await supabaseServer();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("cash_declarations")
    .select("*")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .or(`status.eq.pending,and(status.eq.rejected,created_at.gte.${monthAgo})`)
    .order("created_at", { ascending: false });
  return (data as CashDeclarationRow[] | null) ?? [];
}

export async function countPendingDeclarationsByUser(
  classId: string,
  userId: string
): Promise<number> {
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("cash_declarations")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("user_id", userId)
    .eq("status", "pending");
  return count ?? 0;
}

export async function getCashDeclarationById(
  id: string
): Promise<CashDeclarationRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("cash_declarations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as CashDeclarationRow | null) ?? null;
}
```

(Import di `CashDeclarationRow` da `@/lib/db/types`.)

- [ ] **Step 2: Mutazioni** (in `mutations.ts`, dopo le mutazioni cassa)

```ts
/** Il genitore segnala un versamento fatto fuori dall'app. */
export async function insertCashDeclaration(input: {
  classId: string;
  userId: string;
  amountCents: number;
  method: PaymentMethod;
  note: string | null;
}): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("cash_declarations").insert({
    class_id: input.classId,
    user_id: input.userId,
    amount_cents: input.amountCents,
    method: input.method,
    note: input.note,
  });
  if (error) throw new Error(`Segnalazione fallita: ${error.message}`);
}

/**
 * Conferma del rappresentante: nasce il movimento vero e la
 * dichiarazione viene marcata. Tre passi non atomici (stesso pattern
 * di insertMovementWithShares): se l'ultimo fallisce, la dichiarazione
 * resta pending e la conferma si può ripetere — il chiamante deve
 * controllare status = 'pending' prima di agire.
 */
export async function confirmCashDeclaration(input: {
  declarationId: string;
  classId: string;
  representativeId: string;
  parentId: string;
  amountCents: number;
  method: PaymentMethod;
  title: string;
}): Promise<void> {
  const movement = await insertMovementWithShares({
    classId: input.classId,
    createdBy: input.representativeId,
    kind: "deposit",
    title: input.title,
    method: input.method,
    shares: [{ userId: input.parentId, amountCents: input.amountCents }],
  });

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("cash_declarations")
    .update({
      status: "confirmed",
      movement_id: movement.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.declarationId)
    .eq("status", "pending");
  if (error) throw new Error(`Conferma fallita: ${error.message}`);
}

export async function rejectCashDeclaration(declarationId: string): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("cash_declarations")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", declarationId)
    .eq("status", "pending");
  if (error) throw new Error(`Rifiuto fallito: ${error.message}`);
}
```

- [ ] **Step 3: Typecheck e commit**

Run: `corepack pnpm typecheck` → exit 0.

```bash
git add lib/db/queries.ts lib/db/mutations.ts
git commit -m "Aggiungi strato dati delle dichiarazioni di versamento

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Il genitore dichiara un versamento

**Files:**
- Create: `app/(app)/c/[classCode]/cassa/DichiaraVersamentoForm.tsx`
- Modify: `app/(app)/c/[classCode]/cassa/actions.ts`, `app/(app)/c/[classCode]/cassa/page.tsx`, `lib/validation/schemas.ts`, `lib/i18n/it.ts`

**Interfaces:**
- Consumes: `insertCashDeclaration`, `countPendingDeclarationsByUser`, `listMyDeclarations` (Task 6).
- Produces: `paymentMethodSchema`, `cashDeclarationSchema` (Zod); action `dichiaraVersamentoAction`; chiavi i18n `cassa.metodo*` usate anche dai Task 8-9.

- [ ] **Step 1: Chiavi i18n** (sezione `cassa`)

```ts
    metodoContanti: "Contanti",
    metodoBonifico: "Bonifico",
    metodoSatispay: "Satispay",
    metodoPaypal: "PayPal",
    metodoAltro: "Altro",
    erroreMetodo: "Scegli come hai pagato.",

    dichiaraTitolo: "Hai versato? Segnalalo",
    dichiaraSpiega:
      "Dopo aver pagato, dillo qui: il rappresentante controlla di aver ricevuto i soldi e conferma. Solo allora il versamento compare in cassa.",
    dichiaraMetodoLabel: "Come hai pagato?",
    dichiaraNotaLabel: "Nota per il rappresentante (facoltativa)",
    dichiaraNotaEsempio: "Es. Per la gita a Verona",
    dichiaraBottone: "Segnala il versamento",
    dichiarazioneInviata:
      "Segnalazione inviata. Vedrai il versamento in cassa appena il rappresentante lo conferma.",
    erroreTroppeDichiarazioni:
      "Hai già 5 versamenti in attesa di conferma. Aspetta che il rappresentante li controlli prima di segnalarne altri.",

    tueDichiarazioni: "I tuoi versamenti segnalati",
    statoInAttesa: "In attesa di conferma",
    statoRifiutata: "Non confermato dal rappresentante",
```

- [ ] **Step 2: Schemi Zod** (`schemas.ts`)

```ts
export const paymentMethodSchema = z.enum(
  ["contanti", "bonifico", "satispay", "paypal", "altro"],
  { message: it.cassa.erroreMetodo }
);

export const cashDeclarationSchema = z.object({
  amount: euroCentsSchema,
  method: paymentMethodSchema,
  note: z
    .string()
    .trim()
    .max(120)
    .transform((s) => (s.length > 0 ? s : null))
    .nullable()
    .default(null),
});
```

- [ ] **Step 3: Action** (`cassa/actions.ts`)

```ts
export async function dichiaraVersamentoAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireActiveMembership(classCode);

  const parsed = cashDeclarationSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  // Anti-pasticci: non più di 5 segnalazioni in attesa a testa.
  const pending = await countPendingDeclarationsByUser(ctx.klass.id, ctx.user.id);
  if (pending >= 5) {
    return { error: it.cassa.erroreTroppeDichiarazioni };
  }

  await insertCashDeclaration({
    classId: ctx.klass.id,
    userId: ctx.user.id,
    amountCents: parsed.data.amount,
    method: parsed.data.method,
    note: parsed.data.note,
  });
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/cassa?dichiarata=1`);
}
```

Import nuovi in testa: `cashDeclarationSchema`, `insertCashDeclaration`, `countPendingDeclarationsByUser`.

- [ ] **Step 4: Form client** (`DichiaraVersamentoForm.tsx`)

```tsx
"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { dichiaraVersamentoAction } from "./actions";

export const METODI = [
  { value: "bonifico", label: it.cassa.metodoBonifico },
  { value: "satispay", label: it.cassa.metodoSatispay },
  { value: "paypal", label: it.cassa.metodoPaypal },
  { value: "contanti", label: it.cassa.metodoContanti },
  { value: "altro", label: it.cassa.metodoAltro },
] as const;

export function DichiaraVersamentoForm({ classCode }: { classCode: string }) {
  const [state, formAction] = useActionState(dichiaraVersamentoAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}
      <input type="hidden" name="classCode" value={classCode} />
      <div>
        <Label htmlFor="dichiara-amount">{it.cassa.importoLabel}</Label>
        <Input
          id="dichiara-amount"
          name="amount"
          inputMode="decimal"
          placeholder={it.cassa.importoEsempio}
          required
        />
      </div>
      <div>
        <Label htmlFor="dichiara-method">{it.cassa.dichiaraMetodoLabel}</Label>
        <select
          id="dichiara-method"
          name="method"
          required
          defaultValue="bonifico"
          className="min-h-12 w-full rounded-xl border-2 border-line bg-paper px-4 text-[18px] focus:border-accent focus:outline-none"
        >
          {METODI.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="dichiara-note">{it.cassa.dichiaraNotaLabel}</Label>
        <Input
          id="dichiara-note"
          name="note"
          placeholder={it.cassa.dichiaraNotaEsempio}
          maxLength={120}
        />
      </div>
      <SubmitButton>{it.cassa.dichiaraBottone}</SubmitButton>
    </form>
  );
}
```

- [ ] **Step 5: Montalo in `page.tsx`**

- `searchParams`: aggiungi `dichiarata?: string`; Banner `{dichiarata === "1" && <Banner tone="success">{it.cassa.dichiarazioneInviata}</Banner>}`.
- Carica i dati (nel `Promise.all` esistente aggiungi):

```tsx
  const mieDichiarazioni = !ctx.isRepresentative
    ? await listMyDeclarations(ctx.klass.id, ctx.user.id)
    : [];
```

- Solo genitore, sotto il `ComePagareBox`:

```tsx
      {!ctx.isRepresentative && (
        <Card>
          <h2 className="text-[19px] font-bold">{it.cassa.dichiaraTitolo}</h2>
          <p className="mb-4 mt-1 text-[15px] text-ink-soft">{it.cassa.dichiaraSpiega}</p>
          <DichiaraVersamentoForm classCode={classCode} />
        </Card>
      )}

      {mieDichiarazioni.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-bold">{it.cassa.tueDichiarazioni}</h2>
          <ul className="space-y-3">
            {mieDichiarazioni.map((d) => (
              <li key={d.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-semibold">
                      {formatEuroCents(d.amount_cents)} · {METODO_LABEL[d.method]}
                    </p>
                    <p className="text-[15px] text-ink-soft">
                      {formatShortDateIt(d.created_at)}
                      {d.note ? ` · ${d.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[15px] font-semibold",
                      d.status === "pending"
                        ? "bg-warn-soft text-ink"
                        : "bg-danger-soft text-danger"
                    )}
                  >
                    {d.status === "pending"
                      ? it.cassa.statoInAttesa
                      : it.cassa.statoRifiutata}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
```

Con, a livello di modulo in `page.tsx` (riusata anche dal Task 8):

```tsx
const METODO_LABEL: Record<PaymentMethod, string> = {
  contanti: it.cassa.metodoContanti,
  bonifico: it.cassa.metodoBonifico,
  satispay: it.cassa.metodoSatispay,
  paypal: it.cassa.metodoPaypal,
  altro: it.cassa.metodoAltro,
};
```

NOTA: se le classi `bg-warn-soft` / `bg-danger-soft` non esistono nel tema Tailwind del progetto, usa le più vicine già usate altrove (cerca come sono stilate le pill "in attesa" in `approvazioni`); non inventare colori nuovi.

- [ ] **Step 6: Verifica manuale**

`corepack pnpm typecheck` → exit 0. Browser come Laura: dichiara 10 € bonifico → banner verde + riga "In attesa di conferma". Prova 6 dichiarazioni → alla sesta messaggio del limite. Verifica DB: `cash_declarations` ha le righe con `status='pending'` e i saldi in cassa NON sono cambiati.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/c/[classCode]/cassa" lib/validation/schemas.ts lib/i18n/it.ts
git commit -m "Permetti al genitore di segnalare un versamento da confermare

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Il rappresentante conferma o rifiuta

**Files:**
- Create: `app/(app)/c/[classCode]/cassa/DaConfermareList.tsx`
- Modify: `app/(app)/c/[classCode]/cassa/actions.ts`, `app/(app)/c/[classCode]/cassa/page.tsx`, `lib/validation/schemas.ts`, `lib/i18n/it.ts`

**Interfaces:**
- Consumes: `listPendingDeclarations`, `getCashDeclarationById`, `confirmCashDeclaration`, `rejectCashDeclaration` (Task 6); `paymentMethodSchema`, `METODI` (Task 7).
- Produces: actions `confermaDichiarazioneAction`, `rifiutaDichiarazioneAction`; schema `confirmDeclarationSchema`.

- [ ] **Step 1: Chiavi i18n** (sezione `cassa`)

```ts
    daConfermareTitolo: "Da confermare",
    daConfermareSpiega:
      "Versamenti segnalati dai genitori. Controlla di aver davvero ricevuto i soldi, poi conferma: solo allora entrano in cassa. Puoi correggere importo e metodo se non tornano.",
    confermaBottone: "Conferma e registra",
    rifiutaBottone: "Rifiuta",
    rifiutaTitolo: "Vuoi rifiutare questa segnalazione?",
    rifiutaTesto:
      "Non verrà registrato niente in cassa e il genitore vedrà che il versamento non è stato confermato.",
    rifiutaSi: "Sì, rifiuta",
    rifiutaNo: "Annulla",
    dichiarazioneConfermata: "Versamento confermato e registrato in cassa.",
    dichiarazioneRifiutata: "Segnalazione rifiutata.",
    dichiarazioneNonTrovata:
      "Questa segnalazione non esiste più o è già stata gestita. Ricarica la pagina.",
    segnalatoIl: "segnalato il",
```

- [ ] **Step 2: Schema Zod** (`schemas.ts`)

```ts
export const confirmDeclarationSchema = z.object({
  amount: euroCentsSchema,
  method: paymentMethodSchema,
  title: z
    .string()
    .trim()
    .max(120)
    .transform((s) => (s.length > 0 ? s : it.cassa.causaleVersamentoDefault)),
});
```

- [ ] **Step 3: Actions** (`cassa/actions.ts`)

```ts
export async function confermaDichiarazioneAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const declaration = await getCashDeclarationById(str(formData, "declarationId"));
  if (
    !declaration ||
    declaration.class_id !== ctx.klass.id ||
    declaration.status !== "pending"
  ) {
    return { error: it.cassa.dichiarazioneNonTrovata };
  }

  const parsed = confirmDeclarationSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  // Il dichiarante dev'essere ancora un membro attivo.
  if (!(await isActiveMemberOfClass(declaration.user_id, ctx.klass.id))) {
    return { error: it.cassa.erroreGenitore };
  }

  await confirmCashDeclaration({
    declarationId: declaration.id,
    classId: ctx.klass.id,
    representativeId: ctx.user.id,
    parentId: declaration.user_id,
    amountCents: parsed.data.amount,
    method: parsed.data.method,
    title: parsed.data.title,
  });
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/cassa?confermata=1`);
}

export async function rifiutaDichiarazioneAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const declaration = await getCashDeclarationById(str(formData, "declarationId"));
  if (declaration && declaration.class_id === ctx.klass.id && declaration.status === "pending") {
    await rejectCashDeclaration(declaration.id);
  }
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/cassa?rifiutata=1`);
}
```

- [ ] **Step 4: Componente `DaConfermareList.tsx`** (client: ogni card ha il suo form di conferma + ConfirmSubmit per il rifiuto)

```tsx
"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Card } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { formatShortDateIt } from "@/lib/format-date";
import { centsToEuroText } from "@/lib/euro";
import { it } from "@/lib/i18n/it";
import type { CashDeclarationRow } from "@/lib/db/types";
import { confermaDichiarazioneAction, rifiutaDichiarazioneAction } from "./actions";
import { METODI } from "./DichiaraVersamentoForm";

export interface DichiarazioneView {
  declaration: CashDeclarationRow;
  parentName: string;
}

export function DaConfermareList({
  classCode,
  items,
}: {
  classCode: string;
  items: DichiarazioneView[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[22px] font-bold">
          {it.cassa.daConfermareTitolo} ({items.length})
        </h2>
        <p className="mt-1 text-[15px] text-ink-soft">{it.cassa.daConfermareSpiega}</p>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.declaration.id}>
            <DichiarazioneCard classCode={classCode} item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DichiarazioneCard({
  classCode,
  item,
}: {
  classCode: string;
  item: DichiarazioneView;
}) {
  const [state, formAction] = useActionState(
    confermaDichiarazioneAction,
    initialFormState
  );
  const { declaration, parentName } = item;

  return (
    <Card className="space-y-4">
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}
      <div>
        <p className="text-[18px] font-semibold">{parentName}</p>
        <p className="text-[15px] text-ink-soft">
          {it.cassa.segnalatoIl} {formatShortDateIt(declaration.created_at)}
          {declaration.note ? ` · ${declaration.note}` : ""}
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="classCode" value={classCode} />
        <input type="hidden" name="declarationId" value={declaration.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`amount-${declaration.id}`}>{it.cassa.importoLabel}</Label>
            <Input
              id={`amount-${declaration.id}`}
              name="amount"
              inputMode="decimal"
              defaultValue={centsToEuroText(declaration.amount_cents)}
              required
            />
          </div>
          <div>
            <Label htmlFor={`method-${declaration.id}`}>
              {it.cassa.dichiaraMetodoLabel}
            </Label>
            <select
              id={`method-${declaration.id}`}
              name="method"
              defaultValue={declaration.method}
              className="min-h-12 w-full rounded-xl border-2 border-line bg-paper px-4 text-[18px] focus:border-accent focus:outline-none"
            >
              {METODI.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor={`title-${declaration.id}`}>
            {it.cassa.causaleVersamentoLabel}
          </Label>
          <Input
            id={`title-${declaration.id}`}
            name="title"
            defaultValue={declaration.note ?? ""}
            placeholder={it.cassa.causaleVersamentoEsempio}
            maxLength={120}
          />
        </div>
        <SubmitButton>{it.cassa.confermaBottone}</SubmitButton>
      </form>

      <ConfirmSubmit
        action={rifiutaDichiarazioneAction}
        triggerLabel={it.cassa.rifiutaBottone}
        title={it.cassa.rifiutaTitolo}
        description={it.cassa.rifiutaTesto}
        confirmLabel={it.cassa.rifiutaSi}
        cancelLabel={it.cassa.rifiutaNo}
        variant="secondary"
      >
        <input type="hidden" name="classCode" value={classCode} />
        <input type="hidden" name="declarationId" value={declaration.id} />
      </ConfirmSubmit>
    </Card>
  );
}
```

NOTA: controlla la firma reale di `ConfirmSubmit` (usata in `page.tsx` per l'eliminazione) e adeguati; se `centsToEuroText` produce il separatore italiano con la virgola, va bene così perché `euroCentsSchema` usa `parseEuroToCents`.

- [ ] **Step 5: Montalo in `page.tsx`**

- `searchParams`: aggiungi `confermata?: string; rifiutata?: string` + Banner success (`dichiarazioneConfermata` / `dichiarazioneRifiutata`).
- Carica per il rappresentante:

```tsx
  const daConfermare = ctx.isRepresentative
    ? await listPendingDeclarations(ctx.klass.id)
    : [];
```

- Subito dopo i banner (in cima, prima di quota/saldo):

```tsx
      {ctx.isRepresentative && daConfermare.length > 0 && (
        <DaConfermareList
          classCode={classCode}
          items={daConfermare.map((d) => ({
            declaration: d,
            parentName: nomi.get(d.user_id) ?? "—",
          }))}
        />
      )}
```

(Sposta la costruzione di `nomi` sopra questo blocco se serve.)

- [ ] **Step 6: Verifica manuale**

`corepack pnpm typecheck` → exit 0. Browser: come Denise → "Da confermare (N)" in cima → conferma la dichiarazione di Laura da 10 € → banner verde, il movimento compare nello storico, saldo cassa +10 €, la voce sparisce da "Da confermare". Come Laura: la dichiarazione non è più "in attesa", il movimento c'è. Rifiuta una seconda dichiarazione → Laura la vede "Non confermato". Nel DB: `cash_declarations.status='confirmed'` con `movement_id` valorizzato.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/c/[classCode]/cassa" lib/validation/schemas.ts lib/i18n/it.ts
git commit -m "Aggiungi conferma e rifiuto delle segnalazioni di versamento

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Metodo visibile ovunque (form del rappresentante, storico, CSV)

**Files:**
- Modify: `app/(app)/c/[classCode]/cassa/VersamentoForm.tsx`, `app/(app)/c/[classCode]/cassa/actions.ts`, `app/(app)/c/[classCode]/cassa/page.tsx`, `app/(app)/c/[classCode]/cassa/esporta/route.ts`, `lib/validation/schemas.ts`, `lib/i18n/it.ts`

**Interfaces:**
- Consumes: `METODI`, `METODO_LABEL` (Task 7), `recordCashDeposit` con `method` (Task 2).

- [ ] **Step 1: Selettore metodo nel `VersamentoForm`**

Dopo il campo importo, stesso `<select>` del `DichiaraVersamentoForm` ma `defaultValue="contanti"`, `name="method"`, label `it.cassa.metodoLabelRep`. Nuova chiave i18n:

```ts
    metodoLabelRep: "Come ha pagato?",
```

- [ ] **Step 2: Schema e action**

In `schemas.ts`, `cashDepositSchema` guadagna `method: paymentMethodSchema`. In `registraVersamentoAction` aggiungi `method: formData.get("method")` al parse e `method: parsed.data.method` alla chiamata `recordCashDeposit` (via il temporaneo `"contanti"` del Task 2; per `registraSpesaAction`/`modificaSpesaAction` le spese restano `"contanti"`: sono soldi della cassa spesi dal rappresentante, il metodo non aggiunge informazione — decisione YAGNI).

- [ ] **Step 3: Metodo nello storico**

In `MovementCard` (page.tsx), nella riga tipo (dove c'era `conCarta`):

```tsx
        <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-soft">
          {isDeposit ? it.cassa.versamento : it.cassa.spesa}
          {isDeposit ? ` · ${METODO_LABEL[movement.method]}` : ""}
        </p>
```

- [ ] **Step 4: CSV**

In `esporta/route.ts`: intestazione `it.cassa.csvOrigine` → nuova chiave `it.cassa.csvMetodo` (`csvMetodo: "Metodo"`); il valore diventa la label del metodo (stessa mappa, dichiarata in cima al file):

```ts
const METODO_CSV: Record<PaymentMethod, string> = {
  contanti: it.cassa.metodoContanti,
  bonifico: it.cassa.metodoBonifico,
  satispay: it.cassa.metodoSatispay,
  paypal: it.cassa.metodoPaypal,
  altro: it.cassa.metodoAltro,
};
// nella riga: METODO_CSV[movement.method]
```

Rimuovi da `it.ts` le chiavi ora orfane `csvOrigine`, `csvContanti`, `inContanti` (verifica con grep che nessuno le usi più).

- [ ] **Step 5: Verifica**

`corepack pnpm typecheck` e `corepack pnpm test` → verdi. Browser: Denise registra un versamento contanti → nello storico si legge "VERSAMENTO · Contanti"; il movimento confermato dal Task 8 mostra "· Bonifico". Scarica il CSV → colonna "Metodo" giusta.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/c/[classCode]/cassa" lib/validation/schemas.ts lib/i18n/it.ts
git commit -m "Mostra il metodo di pagamento nei versamenti e nell'export

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Documentazione e chiusura

**Files:**
- Modify: `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/TEST_PLAN.md`, `docs/ARCHITECTURE.md` (solo se cita Stripe), `docs/SETUP.md` (togli STRIPE_SECRET_KEY se citata)

- [ ] **Step 1: ADR-016 in DECISIONS.md**

```markdown
## ADR-016 — Pagamenti fuori dall'app con conferma del rappresentante (supera ADR-014)
**Contesto**: Stripe Connect richiedeva al rappresentante un onboarding KYC con documento d'identità e ~1,5% + 0,25 € di commissioni a transazione: sproporzionato per quote da 5-20 € e per l'utente tipo. I genitori usano già bonifico, Satispay e PayPal.
**Decisione**: il rappresentante pubblica le SUE coordinate (IBAN, paypal.me, numero Satispay) sulla classe; il genitore paga fuori dall'app e lo segnala (`cash_declarations`); la cassa si aggiorna solo quando il rappresentante conferma (nasce il movimento con `method`). ClasseHub non tocca mai denaro.
**Scartato**: Stripe (vedi sopra); registrazione diretta del genitore senza conferma (chiunque potrebbe gonfiare la cassa senza pagare).
**Trade-off accettato**: la conferma è manuale — il rappresentante deve controllare il proprio conto. È lo stesso lavoro che fa oggi col gruppo WhatsApp, ma con una lista ordinata invece di messaggi sparsi.
**Revisione se**: nel pilota i rappresentanti lamentano l'attesa delle conferme o le segnalazioni fantasma superano casi sporadici.
```

Aggiungi anche una riga in coda ad ADR-014: `**Superato da ADR-016** (2026-07-11): codice Stripe rimosso.`

- [ ] **Step 2: ROADMAP.md — sezione V1.6**

Sostituisci le tre voci Stripe con:

```markdown
- [x] Coordinate di pagamento del rappresentante (IBAN/PayPal/Satispay) in impostazioni, cassa e promemoria WhatsApp (ADR-016).
- [x] Versamenti "dichiara → conferma" con metodo di pagamento sul movimento (ADR-016).
- [x] Migrazione 0005 e 0006 eseguite su Supabase.
- [x] Rimosso Stripe (ADR-014 superato da ADR-016).
```

(Spunta le caselle solo se il Task 11 è passato.)

- [ ] **Step 3: TEST_PLAN.md**

Aggiungi la sezione "Cassa — pagamenti semplici" con i 7 scenari della spec (§Test) come passi numerati con esito atteso.

- [ ] **Step 4: Commit**

```bash
git add docs/DECISIONS.md docs/ROADMAP.md docs/TEST_PLAN.md docs/ARCHITECTURE.md docs/SETUP.md
git commit -m "Documenta i pagamenti semplici e il superamento di Stripe

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Test manuale end-to-end su TEST5B (con Denny)

Nessun file. Percorso completo con due utenti (Denise rappresentante, Laura genitore, login via `node scripts/dev-login.js <email>`):

- [ ] 1. Denise inserisce coordinate (IBAN di prova + Satispay) → salvate.
- [ ] 2. Laura vede "Come pagare", copia l'IBAN.
- [ ] 3. Laura segnala 10 € bonifico con nota "Per la gita" → "in attesa"; saldi invariati (controllo DB).
- [ ] 4. Denise conferma correggendo l'importo a 12 € → movimento "Bonifico" da 12 € nello storico, quota di Laura +12 €.
- [ ] 5. Laura segnala 5 € PayPal; Denise rifiuta → Laura vede "Non confermato", saldi invariati.
- [ ] 6. Laura prova a superare le 5 segnalazioni in attesa → bloccata con messaggio chiaro.
- [ ] 7. Export CSV: righe con colonna Metodo (Bonifico/Contanti).
- [ ] 8. RLS: un secondo genitore (es. `giovanni.neri@…`) NON vede le segnalazioni di Laura.
- [ ] 9. `corepack pnpm test` e `corepack pnpm typecheck` verdi.
- [ ] 10. Aggiorna le spunte in ROADMAP (Task 10) se tutto passa, e committa eventuali ritocchi.
