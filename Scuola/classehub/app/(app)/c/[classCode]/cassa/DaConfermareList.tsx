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
