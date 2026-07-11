# Vista genitore ristretta della cassa — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** il genitore vede solo i movimenti che lo riguardano (con le SUE quote), il suo saldo in grande, e il totale di classe come unico aggregato in fondo; il rappresentante non cambia.

**Architecture:** migrazione 0007 sostituisce la SELECT su `cash_movements` (rep = tutto; genitore = solo movimenti con una sua quota, via funzione `has_cash_share` SECURITY DEFINER per evitare la ricorsione RLS tra `cash_movements` e `cash_shares`) e aggiunge `class_cash_total` (SECURITY DEFINER con guardia sul membro attivo). La pagina cassa biforca l'intestazione e la card movimento per ruolo. Spec: `docs/superpowers/specs/2026-07-11-vista-genitore-cassa-design.md`.

**Tech Stack:** Postgres RLS + funzioni SQL, Next.js 15 Server Components, vitest per la logica pura.

## Global Constraints

- Testi SOLO in `lib/i18n/it.ts` (sezione `cassa`), mai hardcoded.
- Query/mutazioni solo via `lib/db/queries.ts` / `lib/db/mutations.ts`. **Vietato** usare `supabaseAdmin` per il totale di classe (decisione esplicita della spec).
- Lato rappresentante: NESSUN cambiamento visibile.
- Funzioni SQL nuove: `security definer set search_path = public` (pattern di `is_active_member`, 0001) e guardie interne.
- TypeScript strict; gate: `corepack pnpm typecheck` exit 0 + `corepack pnpm test` verde (8 test esistenti + i nuovi).
- Commit in italiano, imperativo presente, footer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Radice git = `Progetti`: `git add` con percorsi espliciti, MAI `git add -A`.
- Package manager: `corepack pnpm`.

---

### Task 1: Migrazione 0007 + query `getClassCashTotal`

**Files:**
- Create: `supabase/migrations/0007_vista_genitore_cassa.sql`
- Modify: `lib/db/queries.ts` (nuova funzione dopo `getCashDeclarationById`)

**Interfaces:**
- Consumes: funzioni SQL esistenti `is_active_member`, `is_representative` (0001).
- Produces: `getClassCashTotal(classId: string): Promise<number>` (centesimi; lancia se la RPC fallisce). Funzioni SQL `has_cash_share(uuid)`, `class_cash_total(uuid)`.

- [ ] **Step 1: Scrivi la migrazione**

```sql
-- ============================================================
-- ClasseHub — Vista genitore ristretta della cassa (migrazione 0007)
-- ADR-017: il genitore vede SOLO i movimenti che lo riguardano
-- (una sua riga in cash_shares); spariscono anche i versamenti
-- degli altri. Il controllo collettivo resta il totale aggregato,
-- esposto da una funzione dedicata senza i singoli movimenti.
-- ============================================================

-- "Questo movimento mi riguarda?" — SECURITY DEFINER per evitare la
-- ricorsione RLS: una policy su cash_movements che leggesse
-- cash_shares direttamente riattiverebbe le policy di cash_shares,
-- che a loro volta leggono cash_movements (stesso motivo di
-- is_active_member in 0001).
create or replace function has_cash_share(target_movement uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cash_shares
    where movement_id = target_movement
      and user_id = auth.uid()
  );
$$;

drop policy cash_movements_select on cash_movements;
create policy cash_movements_select_rep on cash_movements
  for select using (is_representative(class_id));
create policy cash_movements_select_own on cash_movements
  for select using (has_cash_share(id));

-- Totale della cassa per i genitori: SOLO la somma, mai i movimenti.
-- Guardia interna: chi non è membro ATTIVO della classe riceve errore,
-- così la funzione non fa da spioncino sulle classi altrui.
create or replace function class_cash_total(target_class uuid)
returns int language plpgsql stable security definer set search_path = public as $$
begin
  if not is_active_member(target_class) then
    raise exception 'Non sei membro attivo di questa classe';
  end if;
  return coalesce((
    select sum(case when kind = 'deposit' then total_cents else -total_cents end)::int
    from cash_movements
    where class_id = target_class
  ), 0);
end;
$$;

revoke execute on function class_cash_total(uuid) from public, anon;
grant execute on function class_cash_total(uuid) to authenticated;
```

- [ ] **Step 2: FERMATI — la migrazione la esegue Denny** nell'SQL Editor di Supabase (file 0007 intero). Poi verifica dal terminale: (a) con la chiave admin `cash_movements` risponde ancora (il service role ignora l'RLS); (b) la RPC c'è: `POST /rest/v1/rpc/class_cash_total` con la chiave admin e `{"target_class":"<id di TEST5B>"}` ritorna il totale in centesimi.

- [ ] **Step 3: Query nello strato dati** (`lib/db/queries.ts`)

```ts
/**
 * Totale della cassa come aggregato (ADR-017): il genitore non vede
 * più tutti i movimenti, quindi il totale arriva da una funzione SQL
 * SECURITY DEFINER che ritorna solo la somma. Client dell'utente:
 * la guardia sul membro attivo sta dentro la funzione.
 */
export async function getClassCashTotal(classId: string): Promise<number> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("class_cash_total", {
    target_class: classId,
  });
  if (error) throw new Error(`Totale cassa non disponibile: ${error.message}`);
  return (data as number | null) ?? 0;
}
```

- [ ] **Step 4: Gate e commit**

Run: `corepack pnpm typecheck` → exit 0; `corepack pnpm test` → 8/8.

```bash
git add supabase/migrations/0007_vista_genitore_cassa.sql lib/db/queries.ts
git commit -m "Aggiungi migrazione vista genitore: RLS ristretta e totale aggregato

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Logica pura `testoSaldoPersonale` (TDD)

**Files:**
- Modify: `lib/cassa/saldi.ts`, `lib/i18n/it.ts`
- Test: `lib/cassa/saldi.test.ts` (nuovo)

**Interfaces:**
- Consumes: `formatEuroCents` da `@/lib/euro`; chiavi i18n nuove.
- Produces: `testoSaldoPersonale(cents: number): { testo: string; negativo: boolean }` — il Task 3 la usa per la riga di contesto.

- [ ] **Step 1: Chiavi i18n** (sezione `cassa`; `{importo}` è un segnaposto sostituito nel codice)

```ts
    quantoRestaTitolo: "Quanto ti resta",
    quantoRestaPositivo: "Hai ancora {importo} in cassa.",
    quantoRestaZero: "Hai usato tutto quello che avevi versato.",
    quantoRestaNegativo: "Devi versare {importo}.",
```

- [ ] **Step 2: Test che falliscono** (`lib/cassa/saldi.test.ts`)

```ts
import { describe, expect, it as test } from "vitest";
import { testoSaldoPersonale } from "./saldi";

describe("testoSaldoPersonale", () => {
  test("positivo: importo formattato dentro la frase", () => {
    const r = testoSaldoPersonale(4650);
    expect(r.testo).toBe("Hai ancora 46,50 € in cassa.");
    expect(r.negativo).toBe(false);
  });
  test("zero: frase fissa", () => {
    const r = testoSaldoPersonale(0);
    expect(r.testo).toBe("Hai usato tutto quello che avevi versato.");
    expect(r.negativo).toBe(false);
  });
  test("negativo: importo in valore assoluto e flag rosso", () => {
    const r = testoSaldoPersonale(-350);
    expect(r.testo).toBe("Devi versare 3,50 €.");
    expect(r.negativo).toBe(true);
  });
});
```

Run: `corepack pnpm test` → FAIL (`testoSaldoPersonale` non esiste).

NOTA: verifica il formato esatto di `formatEuroCents(4650)` in `lib/euro.ts` prima di dare per buone le stringhe attese ("46,50 €" — se lo spazio o il simbolo differiscono, adegua i test alla funzione reale, non viceversa).

- [ ] **Step 3: Implementazione** (in coda a `lib/cassa/saldi.ts`)

```ts
import { formatEuroCents } from "@/lib/euro";
import { it } from "@/lib/i18n/it";

/** La riga di contesto sotto "Quanto ti resta" (ADR-017). */
export function testoSaldoPersonale(cents: number): {
  testo: string;
  negativo: boolean;
} {
  if (cents === 0) return { testo: it.cassa.quantoRestaZero, negativo: false };
  const importo = formatEuroCents(Math.abs(cents));
  if (cents > 0) {
    return {
      testo: it.cassa.quantoRestaPositivo.replace("{importo}", importo),
      negativo: false,
    };
  }
  return {
    testo: it.cassa.quantoRestaNegativo.replace("{importo}", importo),
    negativo: true,
  };
}
```

- [ ] **Step 4: Gate e commit**

Run: `corepack pnpm test` → tutti verdi (8 + 3). `corepack pnpm typecheck` → exit 0.

```bash
git add lib/cassa/saldi.ts lib/cassa/saldi.test.ts lib/i18n/it.ts
git commit -m "Aggiungi il testo del saldo personale del genitore

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Pagina cassa del genitore

**Files:**
- Modify: `app/(app)/c/[classCode]/cassa/page.tsx`, `lib/i18n/it.ts`

**Interfaces:**
- Consumes: `getClassCashTotal` (Task 1), `testoSaldoPersonale` (Task 2), `saldoPersonaleCents`/`saldoCassaCents` esistenti, chiave esistente `it.cassa.nessunMovimentoTuo`.

- [ ] **Step 1: Chiavi i18n** (sezione `cassa`)

```ts
    spesaDiClasse: "spesa di classe",
    totaleClasse: "Totale della classe: {importo} — non è la tua quota.",
```

- [ ] **Step 2: Dati per ruolo** (in `CassaPage`, dopo il blocco `daConfermare`)

```tsx
  // ADR-017: il genitore non vede tutti i movimenti, quindi il totale
  // arriva dall'aggregato SQL; per il rappresentante resta il calcolo
  // dai movimenti (che per lui sono tutti).
  const totaleClasse = ctx.isRepresentative
    ? saldoCassaCents(items.map((i) => i.movement))
    : await getClassCashTotal(ctx.klass.id);
  const miaQuota = saldoPersonaleCents(items, ctx.user.id);
```

e rimuovi la vecchia riga `const saldoCassa = saldoCassaCents(...)` (il rappresentante usa `totaleClasse` nella sua card).

- [ ] **Step 3: Intestazione per ruolo** — sostituisci l'intero blocco `{/* Quota personale + saldo cassa */}` con:

```tsx
      {ctx.isRepresentative ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="text-[16px] font-semibold text-ink-soft">{it.cassa.tuaQuota}</p>
            <p
              className={cn(
                "text-[32px] font-bold",
                miaQuota < 0 ? "text-danger" : "text-ink"
              )}
            >
              {formatEuroCents(Math.abs(miaQuota))}
            </p>
            <p className="text-[15px] text-ink-soft">
              {miaQuota > 0
                ? it.cassa.quotaPositiva
                : miaQuota < 0
                  ? it.cassa.quotaNegativa
                  : it.cassa.quotaZero}
            </p>
          </Card>
          <Card>
            <p className="text-[16px] font-semibold text-ink-soft">{it.cassa.saldoCassa}</p>
            <p className="text-[32px] font-bold">{formatEuroCents(totaleClasse)}</p>
          </Card>
        </div>
      ) : (
        <Card className="text-center">
          <p className="text-[16px] font-semibold text-ink-soft">
            {it.cassa.quantoRestaTitolo}
          </p>
          <p
            className={cn(
              "text-[44px] font-bold leading-tight",
              contestoSaldo.negativo ? "text-danger" : "text-ink"
            )}
          >
            {formatEuroCents(Math.abs(miaQuota))}
          </p>
          <p
            className={cn(
              "text-[15px]",
              contestoSaldo.negativo ? "font-semibold text-danger" : "text-ink-soft"
            )}
          >
            {contestoSaldo.testo}
          </p>
        </Card>
      )}
```

con, tra i calcoli:

```tsx
  const contestoSaldo = testoSaldoPersonale(miaQuota);
```

(import `testoSaldoPersonale` da `@/lib/cassa/saldi`; import `getClassCashTotal` da `@/lib/db/queries`.)

- [ ] **Step 4: Card movimento del genitore** — in `MovementCard`, la colonna destra dell'importo diventa per ruolo. Sostituisci il `<p>` dell'importo con:

```tsx
        <p
          className={cn(
            "text-[20px] font-bold",
            isDeposit ? "text-success" : "text-danger"
          )}
        >
          {isDeposit ? "+" : "−"}
          {formatEuroCents(
            isRepresentative ? movement.total_cents : (myShare?.amount_cents ?? 0)
          )}
        </p>
```

Nella riga informativa sotto il titolo, per il genitore la spesa mostra il contesto di classe invece del dettaglio a testa. Sostituisci il terzo `<p>` (quello con data/intestatario/partecipanti) con:

```tsx
        <p className="text-[15px] text-ink-soft">
          {formatShortDateIt(movement.created_at)}
          {intestatario ? ` · ${intestatario}` : ""}
          {perHead !== null
            ? isRepresentative
              ? ` · ${partecipanti} ${partecipanti === 1 ? it.cassa.partecipante : it.cassa.partecipanti} × ${formatEuroCents(perHead)} ${it.cassa.aTesta}`
              : ` · ${it.cassa.spesaDiClasse} · ${partecipanti} ${partecipanti === 1 ? it.cassa.partecipante : it.cassa.partecipanti}`
            : ""}
        </p>
```

E rimuovi il blocco `{myShare && !isDeposit && (...tuaQuota...)}`: per il genitore la quota È ora l'importo grande della card; per il rappresentante quella riga mostrava la sua quota personale, ma il suo saldo sta già nella card in alto (rimozione concordata nella spec — la card resta più pulita).

NOTA: `intestatario` per il genitore è sempre lui stesso sui suoi versamenti (via RLS vede solo quelli) — va bene che compaia.

- [ ] **Step 5: Totale in fondo (solo genitore)** — subito DOPO la chiusura di `</section>` dei movimenti, prima del `</div>` finale:

```tsx
      {!ctx.isRepresentative && (
        <p className="text-center text-[14px] text-ink-soft">
          {it.cassa.totaleClasse.replace("{importo}", formatEuroCents(totaleClasse))}
        </p>
      )}
```

- [ ] **Step 6: Lista vuota del genitore** — nel ramo `items.length === 0` usa il testo giusto per ruolo:

```tsx
            <p className="text-ink-soft">
              {ctx.isRepresentative ? it.cassa.nessunMovimento : it.cassa.nessunMovimentoTuo}
            </p>
```

- [ ] **Step 7: Gate e commit**

Run: `corepack pnpm typecheck` → exit 0; `corepack pnpm test` → tutti verdi.

```bash
git add "app/(app)/c/[classCode]/cassa/page.tsx" lib/i18n/it.ts
git commit -m "Mostra al genitore solo la sua cassa con il totale aggregato in fondo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: ADR-017 e documentazione

**Files:**
- Modify: `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/TEST_PLAN.md`, `docs/ARCHITECTURE.md` (solo se descrive la vista genitore della cassa)

- [ ] **Step 1: ADR-017 in DECISIONS.md** (in coda, dopo ADR-016)

```markdown
## ADR-017 — Il genitore vede solo la propria cassa (supera in parte ADR-013)
**Contesto**: il genitore vedeva tutti i movimenti della classe col totale; il numero "In cassa adesso" veniva scambiato per la propria disponibilità e i totali delle spese ("−14,00 €") per addebiti personali.
**Decisione**: RLS ristretta — il genitore vede solo i movimenti con una sua quota (spariscono anche i versamenti degli altri: chi versa e quanto è un fatto tra genitore e rappresentante). La sua pagina mostra "Quanto ti resta" col suo saldo; ogni riga mostra la SUA quota. Il totale della classe resta come unico controllo collettivo, in fondo e in piccolo, esposto dalla funzione SECURITY DEFINER `class_cash_total` (mai via admin, mai i singoli movimenti). Il rappresentante vede tutto come prima.
**Scartato**: totale via `supabaseAdmin` (aggirerebbe l'RLS creando un precedente); colonna "totale" mantenuta da trigger (fragile, inutile a questi volumi); lasciare visibili i versamenti altrui (reintroduce i confronti tra famiglie).
**Trade-off accettato**: il genitore non può più ricostruire la contabilità riga per riga; resta il totale aggregato. Accettato perché la fiducia nel rappresentante è già presupposta dal modello (è lui che tiene i contanti).
**Revisione se**: un genitore contesta un ammanco e serve una vista di dettaglio → valutare un riepilogo aggregato delle spese (causale + totale, senza i nomi dei partecipanti).
```

Aggiungi in coda ad ADR-013 la riga: `**Superato in parte da ADR-017** (2026-07-11): vista genitore ristretta.`

- [ ] **Step 2: ROADMAP.md** — in V1.6, dopo l'ultima voce:

```markdown
- [ ] Vista genitore ristretta: solo i propri movimenti, saldo personale in evidenza, totale di classe aggregato (ADR-017). Migrazione 0007.
```

(La spunta arriva col Task 5.)

- [ ] **Step 3: TEST_PLAN.md** — nuova sezione "Cassa — vista genitore ristretta" con i 5 scenari della spec (§Test), passi numerati con esito atteso, nello stile del file.

- [ ] **Step 4: Commit**

```bash
git add docs/DECISIONS.md docs/ROADMAP.md docs/TEST_PLAN.md docs/ARCHITECTURE.md
git commit -m "Documenta la vista genitore ristretta della cassa (ADR-017)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Test end-to-end su TEST5B (con Denny)

Nessun file (tranne la spunta ROADMAP alla fine). Login via `node scripts/dev-login.js <email>`.

- [ ] 1. **Laura** (ha 1 versamento confermato da 12 €): vede "Quanto ti resta 12,00 €" con "Hai ancora 12,00 € in cassa.", la lista con SOLO il suo versamento (+12,00 € · Bonifico), e in fondo "Totale della classe: 48,00 € — non è la tua quota.". Niente card "In cassa adesso".
- [ ] 2. **Giovanni** (nessun movimento): "Quanto ti resta 0,00 €" con "Hai usato tutto quello che avevi versato.", lista vuota col testo `nessunMovimentoTuo`, ma il totale di classe in fondo c'è.
- [ ] 3. **CSV di Laura**: contiene SOLO le sue righe (verifica del punto f della richiesta: la route si appoggia all'RLS — qui lo si prova, non lo si presume).
- [ ] 4. **Denise**: pagina identica a prima (due card in alto, tutti i movimenti coi totali, saldi per membro, CSV completo).
- [ ] 5. **Probe ostile** (la fa Claude dal terminale, con un utente di un'ALTRA classe o con `anon`): chiamata REST alla RPC `class_cash_total` col class_id di TEST5B → errore, nessun totale. E con la chiave `anon` senza login → rifiutata.
- [ ] 6. Se tutto passa: spunta la voce in ROADMAP e commit ("Spunta la vista genitore ristretta dopo il test end-to-end").
