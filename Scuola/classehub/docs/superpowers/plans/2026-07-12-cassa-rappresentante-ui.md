# Cassa rappresentante riorganizzata — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** home cassa del rappresentante come saldo consultabile; versamento, spesa, storico e promemoria su pagine dedicate; azione rapida "Ha pagato" con schermata di conferma a catena.

**Architecture:** UI-only (spec `docs/superpowers/specs/2026-07-12-cassa-rappresentante-ui-design.md`). Nuove route sotto `app/(app)/c/[classCode]/cassa/`: `versamento/`, `versamento/conferma/`, `spesa/` (pagina indice; la route `spesa/[movementId]` di modifica esiste già), `movimenti/`, `promemoria/`. Le Server Actions esistenti si riusano; cambia solo il redirect del versamento. Il ramo genitore di `page.tsx` NON si tocca.

**Tech Stack:** Next.js 15 Server Components + client form, Tailwind, vitest per la logica pura.

## Global Constraints

- Testi SOLO in `lib/i18n/it.ts` (sezione `cassa`), zero jargon nella UI nuova ("Ho ricevuto soldi", "Ha pagato", "deve 3,50 €", "Sono tutti a posto.", "Le ultime entrate e uscite").
- `lib/cassa/saldi.ts`, schema DB, RLS, vista genitore (ADR-017), flusso dichiara→conferma: NON toccare.
- Un solo CTA pieno per pagina. Touch: CTA 56px (`buttonClasses(v,"lg")` = `min-h-14`), bottoni-lista 52px (`min-h-[52px]`), bottoni azione home 64px (`min-h-16`). Rosso solo per debiti e spese.
- Ogni pagina nuova sotto cassa (tranne la home) usa `requireRepresentative(classCode)`.
- Gates per ogni task: `corepack pnpm typecheck` exit 0 + `corepack pnpm test` verde.
- Commit italiano imperativo + footer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Radice git = `Progetti`: `git add` percorsi espliciti, MAI `-A`. Package manager `corepack pnpm`.

---

### Task 1: Helper `dividiPerSaldo` (TDD)

**Files:**
- Create: `lib/cassa/debitori.ts`, `lib/cassa/debitori.test.ts`

**Interfaces:**
- Consumes: nulla (pura). NON tocca `saldi.ts`.
- Produces (per Task 4 e 7):
  ```ts
  export interface SaldoMembro { userId: string; name: string; cents: number; }
  export function dividiPerSaldo(
    membri: Array<{ userId: string; name: string }>,
    saldi: Map<string, number>
  ): { debitori: SaldoMembro[]; aPosto: SaldoMembro[]; totaleDovutoCents: number }
  ```

- [ ] **Step 1: Test (falliscono)** — `lib/cassa/debitori.test.ts`

```ts
import { describe, expect, it as test } from "vitest";
import { dividiPerSaldo } from "./debitori";

const membri = [
  { userId: "a", name: "Anna" },
  { userId: "b", name: "Bruno" },
  { userId: "c", name: "Carla" },
  { userId: "d", name: "Dario" },
];

describe("dividiPerSaldo", () => {
  test("separa debitori e a-posto; chi non ha movimenti ha saldo 0", () => {
    const saldi = new Map([["a", -350], ["b", 1200], ["c", -1000]]);
    const r = dividiPerSaldo(membri, saldi);
    expect(r.debitori.map((m) => m.userId)).toEqual(["c", "a"]); // debito più grande prima
    expect(r.aPosto.map((m) => m.userId)).toEqual(["b", "d"]);   // per nome, incluso Dario (0)
    expect(r.aPosto.find((m) => m.userId === "d")?.cents).toBe(0);
    expect(r.totaleDovutoCents).toBe(1350);
  });
  test("nessun debitore: lista vuota e totale 0", () => {
    const r = dividiPerSaldo(membri, new Map([["a", 500]]));
    expect(r.debitori).toEqual([]);
    expect(r.totaleDovutoCents).toBe(0);
    expect(r.aPosto).toHaveLength(4);
  });
});
```

Run: `corepack pnpm test` → FAIL (`Cannot find module './debitori'`).

- [ ] **Step 2: Implementazione** — `lib/cassa/debitori.ts`

```ts
/**
 * Divide i membri attivi tra chi deve versare (saldo negativo) e chi è
 * a posto. Chi non compare nella mappa dei saldi non ha movimenti: 0.
 * Logica pura, usata da home cassa e pagina versamento.
 */

export interface SaldoMembro {
  userId: string;
  name: string;
  cents: number;
}

export function dividiPerSaldo(
  membri: Array<{ userId: string; name: string }>,
  saldi: Map<string, number>
): { debitori: SaldoMembro[]; aPosto: SaldoMembro[]; totaleDovutoCents: number } {
  const debitori: SaldoMembro[] = [];
  const aPosto: SaldoMembro[] = [];
  for (const m of membri) {
    const cents = saldi.get(m.userId) ?? 0;
    (cents < 0 ? debitori : aPosto).push({ ...m, cents });
  }
  debitori.sort((a, b) => a.cents - b.cents); // più negativo prima
  aPosto.sort((a, b) => a.name.localeCompare(b.name, "it"));
  const totaleDovutoCents = debitori.reduce((s, m) => s - m.cents, 0);
  return { debitori, aPosto, totaleDovutoCents };
}
```

- [ ] **Step 3: Verde + commit**

Run: `corepack pnpm test` (13 verdi) e `corepack pnpm typecheck`.

```bash
git add lib/cassa/debitori.ts lib/cassa/debitori.test.ts
git commit -m "Aggiungi la divisione dei membri per saldo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Nome classe nel promemoria WhatsApp (TDD)

**Files:**
- Modify: `lib/whatsapp/format-message.ts`, `lib/whatsapp/format-message.test.ts`, `app/(app)/c/[classCode]/cassa/page.tsx` (solo il chiamante)

**Interfaces:**
- Produces: `formatCassaReminderForWhatsapp` guadagna `className: string`; riga titolo: `💰 ${it.cassa.waTitolo} — ${className} — ${it.cassa.waServono}`.

- [ ] **Step 1: Aggiorna i test (falliscono)** — in `format-message.test.ts` aggiungi `className: "5B"` agli input esistenti e:

```ts
  test("il titolo contiene il nome della classe", () => {
    const msg = formatCassaReminderForWhatsapp({
      classCode: "ABC123",
      className: "5B Rodari",
      baseUrl: "https://classehub.app",
      coords: null,
    });
    expect(msg.split("\n")[0]).toContain("5B Rodari");
  });
```

Run: `corepack pnpm test` → FAIL (proprietà mancante / titolo senza nome).

- [ ] **Step 2: Implementa** — in `format-message.ts` aggiungi `className: string` all'input e cambia la prima riga in:

```ts
  const lines = [
    `💰 ${it.cassa.waTitolo} — ${input.className} — ${it.cassa.waServono}`,
    it.cassa.waTesto,
  ];
```

In `page.tsx` il chiamante aggiunge `className: ctx.klass.name,`.

- [ ] **Step 3: Verde + commit**

```bash
git add lib/whatsapp "app/(app)/c/[classCode]/cassa/page.tsx"
git commit -m "Aggiungi il nome della classe al promemoria WhatsApp

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Estrai `MovementCard` in un file suo (refactor senza cambi visibili)

**Files:**
- Create: `app/(app)/c/[classCode]/cassa/MovementCard.tsx`
- Modify: `app/(app)/c/[classCode]/cassa/page.tsx`

**Interfaces:**
- Produces: `MovementCard({ item, classCode, userId, isRepresentative, nomi, showActions })` — nuova prop `showActions: boolean` (i bottoni Modifica/Elimina compaiono solo se `isRepresentative && showActions`). `METODO_LABEL` si sposta in questo file ed è esportata (`export const METODO_LABEL`).

- [ ] **Step 1:** Sposta ESATTAMENTE la funzione `MovementCard` e la costante `METODO_LABEL` da `page.tsx` al nuovo file (server component, niente `"use client"`), con gli import che servono (`Link`, `Pencil`, `Card`, `ConfirmSubmit`, `buttonClasses`, `cn`, `formatEuroCents`, `formatShortDateIt`, `it`, `eliminaMovimentoAction`, `MovimentoConQuote`, `PaymentMethod`). Aggiungi la prop `showActions: boolean` e cambia la condizione dei bottoni in `{isRepresentative && showActions && (`. In `page.tsx`: importa `MovementCard` e `METODO_LABEL` dal nuovo file (METODO_LABEL serve alla lista dichiarazioni del genitore) e passa `showActions` (per ora sempre `true`).
- [ ] **Step 2:** Gates, poi:

```bash
git add "app/(app)/c/[classCode]/cassa/MovementCard.tsx" "app/(app)/c/[classCode]/cassa/page.tsx"
git commit -m "Estrai la card del movimento in un componente riusabile

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Pagina "Ho ricevuto soldi" + schermata di conferma

**Files:**
- Create: `app/(app)/c/[classCode]/cassa/versamento/page.tsx`, `app/(app)/c/[classCode]/cassa/versamento/VersamentoNuovoForm.tsx`, `app/(app)/c/[classCode]/cassa/versamento/conferma/page.tsx`
- Modify: `app/(app)/c/[classCode]/cassa/actions.ts` (solo il redirect di `registraVersamentoAction`), `lib/i18n/it.ts`

**Interfaces:**
- Consumes: `dividiPerSaldo` (Task 1); `saldiPerMembroCents`, `saldoCassaCents` (esistenti); `registraVersamentoAction` esistente (campi `classCode`, `parentId`, `amount`, `title`, `method`); `recordCashDeposit` ritorna il movimento; `centsToEuroText`, `parseEuroToCents`, `formatEuroCents` da `lib/euro`; `METODI` da `../DichiaraVersamentoForm`; `getCashMovementById`, `listCashSharesByMovement`, `listActiveMembers`, `listCashMovementsWithShares` da queries; `eliminaMovimentoAction`.
- Produces: route `/cassa/versamento` (query `?genitore=<id>` preseleziona) e `/cassa/versamento/conferma?m=<movementId>`.

- [ ] **Step 1: Chiavi i18n** (sezione `cassa`)

```ts
    ricevutoTitolo: "Ho ricevuto soldi",
    ricevutoScegli: "Chi ti ha dato i soldi?",
    ricevutoImporto: "Quanto ti ha dato?",
    deveImporto: "deve {importo}",
    aPostoEtichetta: "a posto",
    microDeve: "Deve {importo}. Se ti ha dato di più o di meno, correggi.",
    microAnticipo: "Non deve niente: sta versando in anticipo.",
    riepilogoVersamento: "{nome} ti ha dato {importo}. In cassa: {totale}.",
    metodoRipiegato: "In contanti ·",
    metodoRipiegatoLink: "ha pagato in un altro modo?",
    registraVersamentoCta: "Registra il versamento",

    confermaVersamentoTitolo: "Versamento registrato",
    confermaFrase: "{nome} ti ha dato {importo} {metodo}.",
    confermaOraAPosto: "Ora è a posto.",
    metodoFraseContanti: "in contanti",
    metodoFraseBonifico: "con un bonifico",
    metodoFraseSatispay: "con Satispay",
    metodoFrasePaypal: "con PayPal",
    metodoFraseAltro: "con un altro metodo",
    primaEra: "prima: {importo}",
    mancaAncoraTitolo: "Manca ancora",
    mancaAncoraDettaglio: "{n} da versare · {importo}",
    nessunoManca: "Nessuno: sono tutti a posto.",
    chiDeveAncora: "Chi deve ancora versare",
    haPagato: "Ha pagato",
    annullaVersamento: "Annulla questo versamento",
    annullaVersamentoTitolo: "Vuoi annullare questo versamento?",
    annullaVersamentoTesto:
      "Il versamento sparisce dalla cassa e il saldo torna com'era. Potrai registrarlo di nuovo.",
    annullaVersamentoSi: "Sì, annulla",
    annullaVersamentoNo: "No, torna indietro",
    tornaCassa: "Torna alla cassa",
```

- [ ] **Step 2: Redirect dell'action** — in `actions.ts`, `registraVersamentoAction`: la chiamata diventa

```ts
  const movement = await recordCashDeposit({ ...come oggi... });
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(
    `/c/${classCode}/cassa/versamento/conferma?m=${encodeURIComponent(movement.id)}`
  );
```

(non usa più `finish()`; `finish()` resta per le spese).

- [ ] **Step 3: Pagina server `/cassa/versamento`** — `versamento/page.tsx`

```tsx
import { requireRepresentative } from "@/lib/auth/require-membership";
import { listActiveMembers, listCashMovementsWithShares } from "@/lib/db/queries";
import { saldiPerMembroCents, saldoCassaCents } from "@/lib/cassa/saldi";
import { dividiPerSaldo } from "@/lib/cassa/debitori";
import { it } from "@/lib/i18n/it";
import { VersamentoNuovoForm } from "./VersamentoNuovoForm";

export const metadata = { title: `${it.cassa.ricevutoTitolo} — ${it.app.name}` };

export default async function VersamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ genitore?: string }>;
}) {
  const { classCode } = await params;
  const { genitore } = await searchParams;
  const ctx = await requireRepresentative(classCode);

  const [items, members] = await Promise.all([
    listCashMovementsWithShares(ctx.klass.id),
    listActiveMembers(ctx.klass.id),
  ]);
  const membri = members.map((m) => ({
    userId: m.membership.user_id,
    name: m.profile?.display_name ?? m.email ?? "?",
  }));
  const { debitori, aPosto } = dividiPerSaldo(membri, saldiPerMembroCents(items));
  const saldoCassa = saldoCassaCents(items.map((i) => i.movement));
  const preselezionato = membri.some((m) => m.userId === genitore) ? genitore! : null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-bold">{it.cassa.ricevutoTitolo}</h1>
      <VersamentoNuovoForm
        classCode={classCode}
        debitori={debitori}
        aPosto={aPosto}
        saldoCassaCents={saldoCassa}
        preselezionato={preselezionato}
      />
    </div>
  );
}
```

- [ ] **Step 4: Form client** — `versamento/VersamentoNuovoForm.tsx`

```tsx
"use client";

import { useActionState, useState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { centsToEuroText, formatEuroCents, parseEuroToCents } from "@/lib/euro";
import { cn } from "@/lib/cn";
import { it } from "@/lib/i18n/it";
import type { SaldoMembro } from "@/lib/cassa/debitori";
import { registraVersamentoAction } from "../actions";
import { METODI } from "../DichiaraVersamentoForm";

export function VersamentoNuovoForm({
  classCode,
  debitori,
  aPosto,
  saldoCassaCents,
  preselezionato,
}: {
  classCode: string;
  debitori: SaldoMembro[];
  aPosto: SaldoMembro[];
  saldoCassaCents: number;
  preselezionato: string | null;
}) {
  const tutti = [...debitori, ...aPosto];
  const [state, formAction] = useActionState(registraVersamentoAction, initialFormState);
  const [sceltoId, setSceltoId] = useState<string | null>(preselezionato);
  const scelto = tutti.find((m) => m.userId === sceltoId) ?? null;
  const dovuto = scelto && scelto.cents < 0 ? -scelto.cents : 0;
  const [importo, setImporto] = useState(dovuto > 0 ? centsToEuroText(dovuto) : "");
  const [mostraMetodi, setMostraMetodi] = useState(false);

  function scegli(m: SaldoMembro) {
    setSceltoId(m.userId);
    setImporto(m.cents < 0 ? centsToEuroText(-m.cents) : "");
  }

  const importoCents = parseEuroToCents(importo);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}
      <input type="hidden" name="classCode" value={classCode} />
      <input type="hidden" name="parentId" value={sceltoId ?? ""} />

      <fieldset>
        <legend className="mb-2 block text-[16px] font-semibold text-ink-soft">
          {it.cassa.ricevutoScegli}
        </legend>
        <ul className="space-y-2">
          {tutti.map((m) => (
            <li key={m.userId}>
              <button
                type="button"
                onClick={() => scegli(m)}
                aria-pressed={m.userId === sceltoId}
                className={cn(
                  "flex min-h-[52px] w-full items-center justify-between rounded-xl border-2 px-4 text-[18px]",
                  m.userId === sceltoId
                    ? "border-accent bg-accent-light font-semibold"
                    : "border-line bg-paper hover:border-accent"
                )}
              >
                <span>{m.name}</span>
                {m.cents < 0 ? (
                  <span className="font-semibold text-danger">
                    {it.cassa.deveImporto.replace(
                      "{importo}",
                      formatEuroCents(-m.cents)
                    )}
                  </span>
                ) : (
                  <span className="text-ink-soft">{it.cassa.aPostoEtichetta}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {scelto && (
        <>
          <div>
            <Label htmlFor="amount">{it.cassa.ricevutoImporto}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                className="min-h-[52px] text-right text-[22px] font-semibold"
                required
              />
              <span className="text-[22px] font-semibold text-ink-soft">€</span>
            </div>
            <p className="mt-1 text-[15px] text-ink-soft">
              {dovuto > 0
                ? it.cassa.microDeve.replace("{importo}", formatEuroCents(dovuto))
                : it.cassa.microAnticipo}
            </p>
          </div>

          <div>
            <Label htmlFor="deposit-title">{it.cassa.causaleVersamentoLabel}</Label>
            <Input
              id="deposit-title"
              name="title"
              placeholder={it.cassa.causaleVersamentoEsempio}
              maxLength={120}
            />
          </div>

          {mostraMetodi ? (
            <div>
              <Label htmlFor="method">{it.cassa.metodoLabelRep}</Label>
              <select
                id="method"
                name="method"
                defaultValue="contanti"
                className="min-h-12 w-full rounded-xl border-2 border-line bg-paper px-4 text-[18px] focus:border-accent focus:outline-none"
              >
                {METODI.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[15px] text-ink-soft">
              {it.cassa.metodoRipiegato}{" "}
              <button
                type="button"
                onClick={() => setMostraMetodi(true)}
                className="min-h-12 font-semibold text-accent underline underline-offset-4"
              >
                {it.cassa.metodoRipiegatoLink}
              </button>
              <input type="hidden" name="method" value="contanti" />
            </p>
          )}

          {importoCents !== null && importoCents > 0 && (
            <Card className="bg-accent-light">
              <p className="text-[17px]">
                {it.cassa.riepilogoVersamento
                  .replace("{nome}", scelto.name)
                  .replace("{importo}", formatEuroCents(importoCents))
                  .replace(
                    "{totale}",
                    formatEuroCents(saldoCassaCents + importoCents)
                  )}
              </p>
            </Card>
          )}

          <SubmitButton size="lg">{it.cassa.registraVersamentoCta}</SubmitButton>
        </>
      )}
    </form>
  );
}
```

NOTA per l'implementatore: verifica che `lib/euro.ts` non abbia `server-only` (i suoi helper servono lato client qui). Se `bg-accent-light` non esiste nel tema, usa il token più vicino già usato altrove (grep in `app/globals.css`). L'`<input hidden name="method">` nel ramo ripiegato garantisce che il campo arrivi sempre all'action.

- [ ] **Step 5: Pagina di conferma** — `versamento/conferma/page.tsx`

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@/components/shared/Banner";
import { Card } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { buttonClasses } from "@/components/ui/Button";
import { requireRepresentative } from "@/lib/auth/require-membership";
import {
  getCashMovementById,
  listActiveMembers,
  listCashMovementsWithShares,
  listCashSharesByMovement,
} from "@/lib/db/queries";
import { saldiPerMembroCents, saldoCassaCents } from "@/lib/cassa/saldi";
import { dividiPerSaldo } from "@/lib/cassa/debitori";
import { formatEuroCents } from "@/lib/euro";
import { it } from "@/lib/i18n/it";
import type { PaymentMethod } from "@/lib/db/types";
import { eliminaMovimentoAction } from "../../actions";

export const metadata = {
  title: `${it.cassa.confermaVersamentoTitolo} — ${it.app.name}`,
};

const METODO_FRASE: Record<PaymentMethod, string> = {
  contanti: it.cassa.metodoFraseContanti,
  bonifico: it.cassa.metodoFraseBonifico,
  satispay: it.cassa.metodoFraseSatispay,
  paypal: it.cassa.metodoFrasePaypal,
  altro: it.cassa.metodoFraseAltro,
};

export default async function ConfermaVersamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { classCode } = await params;
  const { m } = await searchParams;
  const ctx = await requireRepresentative(classCode);
  const cassaUrl = `/c/${classCode}/cassa`;

  const movement = m ? await getCashMovementById(m) : null;
  if (!movement || movement.class_id !== ctx.klass.id || movement.kind !== "deposit") {
    redirect(cassaUrl);
  }

  const [items, members, shares] = await Promise.all([
    listCashMovementsWithShares(ctx.klass.id),
    listActiveMembers(ctx.klass.id),
    listCashSharesByMovement(movement.id),
  ]);
  const membri = members.map((mm) => ({
    userId: mm.membership.user_id,
    name: mm.profile?.display_name ?? mm.email ?? "?",
  }));
  const saldi = saldiPerMembroCents(items);
  const { debitori, totaleDovutoCents } = dividiPerSaldo(membri, saldi);

  const versante = shares[0];
  const nomeVersante = versante
    ? (membri.find((x) => x.userId === versante.user_id)?.name ?? "—")
    : "—";
  const saldoVersante = versante ? (saldi.get(versante.user_id) ?? 0) : 0;
  const totaleOra = saldoCassaCents(items.map((i) => i.movement));
  const totalePrima = totaleOra - movement.total_cents;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div aria-live="polite">
        <Banner tone="success">
          {it.cassa.confermaVersamentoTitolo} —{" "}
          {it.cassa.confermaFrase
            .replace("{nome}", nomeVersante)
            .replace("{importo}", formatEuroCents(movement.total_cents))
            .replace("{metodo}", METODO_FRASE[movement.method])}
          {saldoVersante >= 0 ? ` ${it.cassa.confermaOraAPosto}` : ""}
        </Banner>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-[16px] font-semibold text-ink-soft">
            {it.cassa.saldoCassa}
          </p>
          <p className="text-[32px] font-bold">{formatEuroCents(totaleOra)}</p>
          <p className="text-[15px] text-ink-soft">
            {it.cassa.primaEra.replace("{importo}", formatEuroCents(totalePrima))}
          </p>
        </Card>
        <Card>
          <p className="text-[16px] font-semibold text-ink-soft">
            {it.cassa.mancaAncoraTitolo}
          </p>
          <p className="text-[20px] font-semibold">
            {debitori.length === 0
              ? it.cassa.nessunoManca
              : it.cassa.mancaAncoraDettaglio
                  .replace("{n}", String(debitori.length))
                  .replace("{importo}", formatEuroCents(totaleDovutoCents))}
          </p>
        </Card>
      </div>

      {debitori.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-bold">{it.cassa.chiDeveAncora}</h2>
          <ul className="space-y-2">
            {debitori.map((d) => (
              <li key={d.userId}>
                <Card className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-[18px] font-semibold">{d.name}</p>
                    <p className="text-[15px] font-semibold text-danger">
                      {it.cassa.deveImporto.replace(
                        "{importo}",
                        formatEuroCents(-d.cents)
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/c/${classCode}/cassa/versamento?genitore=${d.userId}`}
                    className={buttonClasses("secondary")}
                  >
                    {it.cassa.haPagato}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <Link href={cassaUrl} className={buttonClasses("primary", "lg")}>
          {it.cassa.tornaCassa}
        </Link>
        <ConfirmSubmit
          action={eliminaMovimentoAction}
          triggerLabel={it.cassa.annullaVersamento}
          title={it.cassa.annullaVersamentoTitolo}
          description={it.cassa.annullaVersamentoTesto}
          confirmLabel={it.cassa.annullaVersamentoSi}
          cancelLabel={it.cassa.annullaVersamentoNo}
          variant="secondary"
        >
          <input type="hidden" name="classCode" value={classCode} />
          <input type="hidden" name="movementId" value={movement.id} />
        </ConfirmSubmit>
      </div>
    </div>
  );
}
```

NOTA: la pagina ha un solo CTA pieno ("Torna alla cassa"); "Annulla" e "Ha pagato" sono secondary. Verifica la firma reale di `ConfirmSubmit` prima di usarla.

- [ ] **Step 6: Gates + commit**

```bash
git add "app/(app)/c/[classCode]/cassa/versamento" "app/(app)/c/[classCode]/cassa/actions.ts" lib/i18n/it.ts
git commit -m "Aggiungi la pagina Ho ricevuto soldi con conferma a catena

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Pagine "Ho speso soldi" e "Ricorda a tutti"

**Files:**
- Create: `app/(app)/c/[classCode]/cassa/spesa/page.tsx`, `app/(app)/c/[classCode]/cassa/promemoria/page.tsx`
- Modify: `lib/i18n/it.ts`

NOTA route: `cassa/spesa/[movementId]/page.tsx` (modifica spesa) esiste già; la nuova `cassa/spesa/page.tsx` è la pagina indice della stessa cartella — convivono.

**Interfaces:**
- Consumes: `SpesaForm` e `PromemoriaWhatsapp` esistenti; `formatCassaReminderForWhatsapp` con `className` (Task 2).

- [ ] **Step 1: i18n**

```ts
    spesoTitolo: "Ho speso soldi",
```

- [ ] **Step 2: `spesa/page.tsx`**

```tsx
import { requireRepresentative } from "@/lib/auth/require-membership";
import { listActiveMembers } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { SpesaForm } from "../SpesaForm";

export const metadata = { title: `${it.cassa.spesoTitolo} — ${it.app.name}` };

export default async function SpesaPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const ctx = await requireRepresentative(classCode);
  const members = await listActiveMembers(ctx.klass.id);
  const memberOptions = members.map((m) => ({
    userId: m.membership.user_id,
    name: m.profile?.display_name ?? m.email ?? "?",
  }));

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.cassa.spesoTitolo}</h1>
        <p className="mt-1 text-ink-soft">{it.cassa.registraSpesaSpiega}</p>
      </div>
      <SpesaForm classCode={classCode} members={memberOptions} />
    </div>
  );
}
```

(La `registraSpesaAction` già torna a `/cassa?fatto=1`: il banner di successo appare sulla home — comportamento voluto.)

- [ ] **Step 3: `promemoria/page.tsx`**

```tsx
import { requireRepresentative } from "@/lib/auth/require-membership";
import { formatCassaReminderForWhatsapp } from "@/lib/whatsapp/format-message";
import { getBaseUrl } from "@/lib/base-url";
import { it } from "@/lib/i18n/it";
import { PromemoriaWhatsapp } from "../PromemoriaWhatsapp";

export const metadata = { title: `${it.cassa.promemoriaTitolo} — ${it.app.name}` };

export default async function PromemoriaPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const ctx = await requireRepresentative(classCode);

  const testo = formatCassaReminderForWhatsapp({
    classCode: ctx.klass.class_code,
    className: ctx.klass.name,
    baseUrl: await getBaseUrl(),
    coords: {
      iban: ctx.klass.payment_iban,
      ibanHolder: ctx.klass.payment_iban_holder,
      paypal: ctx.klass.payment_paypal,
      satispay: ctx.klass.payment_satispay,
    },
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.cassa.promemoriaTitolo}</h1>
        <p className="mt-1 text-ink-soft">{it.cassa.promemoriaSpiega}</p>
      </div>
      <PromemoriaWhatsapp defaultText={testo} />
    </div>
  );
}
```

- [ ] **Step 4: Gates + commit**

```bash
git add "app/(app)/c/[classCode]/cassa/spesa/page.tsx" "app/(app)/c/[classCode]/cassa/promemoria" lib/i18n/it.ts
git commit -m "Sposta spesa e promemoria WhatsApp su pagine dedicate

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Pagina `/cassa/movimenti` (storico completo)

**Files:**
- Create: `app/(app)/c/[classCode]/cassa/movimenti/page.tsx`
- Modify: `lib/i18n/it.ts`

**Interfaces:**
- Consumes: `MovementCard` con `showActions` (Task 3); la logica filtri/`withFilters` va COPIATA dalla home attuale (la home la perde nel Task 7).

- [ ] **Step 1: i18n**

```ts
    entrateUsciteTitolo: "Tutte le entrate e uscite",
```

- [ ] **Step 2: `movimenti/page.tsx`** — pagina `requireRepresentative` che replica ESATTAMENTE la sezione movimenti odierna della home (filtri chips Tutti/Versamenti/Spese, select per genitore, card export, lista con `MovementCard showActions`), con: titolo `it.cassa.entrateUsciteTitolo`; i link dei filtri puntano a `/c/${classCode}/cassa/movimenti${withFilters(...)}`; il form del filtro genitore ha `action={`/c/${classCode}/cassa/movimenti`}`; la card export usa `esportaSpiegaRep` e `withFilters({})` come oggi. Prendi il codice attuale da `page.tsx` (righe della sezione filtri+export+lista) e adattalo: stessa struttura, `userId={ctx.user.id}`, `isRepresentative={true}`, `showActions={true}`, empty state `it.cassa.nessunMovimento`.

- [ ] **Step 3: Gates + commit**

```bash
git add "app/(app)/c/[classCode]/cassa/movimenti" lib/i18n/it.ts
git commit -m "Aggiungi la pagina con tutte le entrate e uscite della cassa

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Nuova home cassa (ramo rappresentante)

**Files:**
- Modify: `app/(app)/c/[classCode]/cassa/page.tsx`, `lib/i18n/it.ts`
- Delete: `app/(app)/c/[classCode]/cassa/VersamentoForm.tsx` (il vecchio form inline non ha più chiamanti)

**Interfaces:**
- Consumes: `dividiPerSaldo` (Task 1), `MovementCard showActions=false` (Task 3), route dei Task 4-6.
- Il ramo GENITORE di `page.tsx` resta INTATTO (intestazione "Quanto ti resta", Come pagare, dichiarazioni, lista, totale in fondo).

- [ ] **Step 1: i18n**

```ts
    devonoVersare: "{n} genitori devono ancora versare {importo}.",
    deveVersareUno: "1 genitore deve ancora versare {importo}.",
    bottoneRicevuto: "Ho ricevuto soldi",
    bottoneSpeso: "Ho speso soldi",
    chiDeveVersareTitolo: "Chi deve versare",
    ricordaATutti: "Ricorda a tutti",
    tuttiAPosto: "Sono tutti a posto.",
    genitoriAPosto: "{n} genitori sono a posto",
    genitoreAPostoUno: "1 genitore è a posto",
    ultimeEntrateUscite: "Le ultime entrate e uscite",
    vediTutti: "Vedi tutti",
    excel: "Excel",
```

- [ ] **Step 2: Ristruttura il ramo rappresentante** di `page.tsx`. Restano identici: header pagina, banner (tutti, incluso `fatto` per le spese), `DaConfermareList`, invito coordinate, e TUTTO il ramo genitore. Il resto del ramo rappresentante diventa, nell'ordine:

```tsx
      {/* 1. Saldo grande */}
      <Card className="text-center">
        <p className="text-[16px] font-semibold text-ink-soft">{it.cassa.saldoCassa}</p>
        <p className="text-[44px] font-bold leading-tight">
          {formatEuroCents(totaleClasseRep)}
        </p>
        {debitori.length > 0 && (
          <p className="text-[15px] text-ink-soft">
            {(debitori.length === 1
              ? it.cassa.deveVersareUno
              : it.cassa.devonoVersare.replace("{n}", String(debitori.length))
            ).replace("{importo}", formatEuroCents(totaleDovutoCents))}
          </p>
        )}
      </Card>

      {/* 2. Da confermare: già sopra, subito dopo i banner */}

      {/* 3. Due azioni grandi */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/c/${classCode}/cassa/versamento`}
          className={buttonClasses("primary", "lg", "min-h-16")}
        >
          {it.cassa.bottoneRicevuto}
        </Link>
        <Link
          href={`/c/${classCode}/cassa/spesa`}
          className={buttonClasses("secondary", "lg", "min-h-16")}
        >
          {it.cassa.bottoneSpeso}
        </Link>
      </div>

      {/* 4. Chi deve versare */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-bold">{it.cassa.chiDeveVersareTitolo}</h2>
          <Link
            href={`/c/${classCode}/cassa/promemoria`}
            className={buttonClasses("secondary")}
          >
            {it.cassa.ricordaATutti}
          </Link>
        </div>
        {debitori.length === 0 ? (
          <Card>
            <p className="text-ink-soft">{it.cassa.tuttiAPosto}</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {debitori.map((d) => (
              <li key={d.userId}>
                <Card className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-[18px] font-semibold">{d.name}</p>
                    <p className="text-[15px] font-semibold text-danger">
                      {it.cassa.deveImporto.replace(
                        "{importo}",
                        formatEuroCents(-d.cents)
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/c/${classCode}/cassa/versamento?genitore=${d.userId}`}
                    className={buttonClasses("secondary")}
                  >
                    {it.cassa.haPagato}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Accordion: chi è a posto */}
      {aPosto.length > 0 && (
        <details className="rounded-2xl border border-line bg-paper px-5 py-4">
          <summary className="min-h-12 cursor-pointer text-[17px] font-semibold">
            {aPosto.length === 1
              ? it.cassa.genitoreAPostoUno
              : it.cassa.genitoriAPosto.replace("{n}", String(aPosto.length))}
          </summary>
          <ul className="mt-3 divide-y divide-line">
            {aPosto.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between py-2 text-[17px]"
              >
                <span>{m.name}</span>
                <span className="text-ink-soft">{formatEuroCents(m.cents)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* 6. Le ultime entrate e uscite */}
      <section>
        <h2 className="mb-3 text-[22px] font-bold">{it.cassa.ultimeEntrateUscite}</h2>
        {items.length === 0 ? (
          <Card>
            <p className="text-ink-soft">{it.cassa.nessunMovimento}</p>
          </Card>
        ) : (
          <>
            <ul className="space-y-3">
              {items.slice(0, 5).map((item) => (
                <li key={item.movement.id}>
                  <MovementCard
                    item={item}
                    classCode={classCode}
                    userId={ctx.user.id}
                    isRepresentative={true}
                    nomi={nomi}
                    showActions={false}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/c/${classCode}/cassa/movimenti`}
                className={buttonClasses("secondary")}
              >
                {it.cassa.vediTutti}
              </Link>
              <a
                href={`/c/${classCode}/cassa/esporta`}
                download
                className={buttonClasses("secondary")}
              >
                <Download className="size-5" aria-hidden /> {it.cassa.excel}
              </a>
            </div>
          </>
        )}
      </section>
```

con, tra i calcoli (solo per il rappresentante):

```tsx
  const { debitori, aPosto, totaleDovutoCents } = ctx.isRepresentative
    ? dividiPerSaldo(memberOptions, saldiPerMembroCents(items))
    : { debitori: [], aPosto: [], totaleDovutoCents: 0 };
```

**Rimozioni dal ramo rappresentante** (spostate nei Task 4-6): le due card affiancate, la sezione "Registra un movimento" coi form inline, il box promemoria a piena altezza, la sezione "quote dei genitori" (assorbita da Chi-deve-versare + accordion), la card export, i filtri e la lista completa. Il genitore continua a vedere la SUA lista movimenti come oggi: la sezione movimenti esistente resta quindi per il solo ramo genitore (condizione `!ctx.isRepresentative` attorno a filtri-chips? NO: i chips per il genitore restano come oggi — muovi solo il blocco `ctx.isRepresentative` del filtro-per-genitore, che sparisce dalla home perché vive in /movimenti). Import da rimuovere: `VersamentoForm`, `SpesaForm`, `PromemoriaWhatsapp`, `Button` (se resta inutilizzato), `formatCassaReminderForWhatsapp`/`getBaseUrl` (il promemoria non si calcola più in home). Poi `git rm` di `VersamentoForm.tsx` e verifica con grep che nessuno importi più `VersamentoForm`.

- [ ] **Step 3: Gates + commit**

```bash
git rm "app/(app)/c/[classCode]/cassa/VersamentoForm.tsx"
git add "app/(app)/c/[classCode]/cassa/page.tsx" lib/i18n/it.ts
git commit -m "Riorganizza la home cassa del rappresentante attorno al saldo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Documentazione

**Files:**
- Modify: `docs/ROADMAP.md`, `docs/TEST_PLAN.md`

- [ ] **Step 1: ROADMAP** — in V1.6, in coda:

```markdown
- [ ] Home cassa del rappresentante riorganizzata: saldo in cima, "Chi deve versare" con azione rapida "Ha pagato", form su pagine dedicate, promemoria come pagina (spec 2026-07-12).
```

(Spunta col Task 9.)

- [ ] **Step 2: TEST_PLAN** — nuova sezione "Cassa — home rappresentante riorganizzata" con gli scenari del §Test della spec (home, catena Ha pagato ×2, annulla, spesa, movimenti+filtri, export, promemoria col nome classe, vista genitore invariata), numerati con esito atteso nello stile del file.

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md docs/TEST_PLAN.md
git commit -m "Documenta la riorganizzazione della cassa del rappresentante

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Test end-to-end su TEST5B (con Denny) + review finale

Nessun file (tranne la spunta ROADMAP alla fine).

- [ ] 1. **Denise, home**: saldo grande 48,00 € in cima; riga debitori coerente; bottoni "Ho ricevuto soldi"/"Ho speso soldi"; "Chi deve versare" con i debitori reali e "Ha pagato"; "Ricorda a tutti"; accordion chiuso con chi è a posto; ultime 5 entrate/uscite senza bottoni; "Vedi tutti" ed "Excel".
- [ ] 2. **Catena**: "Ha pagato" su un debitore → form precompilato → registra → conferma con "prima: …" e la lista di chi manca → "Ha pagato" sul successivo direttamente da lì.
- [ ] 3. **Annulla** dalla conferma → il saldo torna com'era.
- [ ] 4. **Versamento in anticipo**: genitore "a posto" → micro-copy "sta versando in anticipo"; metodo ripiegato → link apre il selettore.
- [ ] 5. **Spesa** da pagina dedicata → banner sulla home.
- [ ] 6. **Movimenti**: filtri, modifica/elimina, export coi filtri.
- [ ] 7. **Promemoria**: testo col nome della classe, Copia funziona.
- [ ] 8. **Laura (genitore)**: la sua vista è INVARIATA rispetto a stanotte.
- [ ] 9. Gates finali (`test`, `typecheck`) + spunta ROADMAP + commit.
