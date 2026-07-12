"use client";

import { useActionState, useState } from "react";
import { Banner } from "@/components/shared/Banner";
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
            <div className="rounded-2xl border border-line bg-accent-light p-5 shadow-sm">
              <p className="text-[17px]">
                {it.cassa.riepilogoVersamento
                  .replace("{nome}", scelto.name)
                  .replace("{importo}", formatEuroCents(importoCents))
                  .replace(
                    "{totale}",
                    formatEuroCents(saldoCassaCents + importoCents)
                  )}
              </p>
            </div>
          )}

          <SubmitButton size="lg">{it.cassa.registraVersamentoCta}</SubmitButton>
        </>
      )}
    </form>
  );
}
