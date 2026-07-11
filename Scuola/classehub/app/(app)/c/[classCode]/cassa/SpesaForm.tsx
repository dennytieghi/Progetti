"use client";

import { useState, useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { centsToEuroText, formatEuroCents, parseEuroToCents } from "@/lib/euro";
import { it } from "@/lib/i18n/it";
import { modificaSpesaAction, registraSpesaAction } from "./actions";
import type { MemberOption } from "./MovementCard";

/** Spesa esistente da modificare; assente = si registra una nuova. */
export interface SpesaDaModificare {
  movementId: string;
  title: string;
  perHeadCents: number;
  participantIds: string[];
}

export function SpesaForm({
  classCode,
  members,
  spesa,
}: {
  classCode: string;
  members: MemberOption[];
  spesa?: SpesaDaModificare;
}) {
  const [state, formAction] = useActionState(
    spesa ? modificaSpesaAction : registraSpesaAction,
    initialFormState
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(spesa?.participantIds ?? [])
  );
  const [amountText, setAmountText] = useState(
    spesa ? centsToEuroText(spesa.perHeadCents) : ""
  );

  const perHeadCents = parseEuroToCents(amountText);
  const totalCents =
    perHeadCents !== null && selected.size > 0 ? perHeadCents * selected.size : null;

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <input type="hidden" name="classCode" value={classCode} />
      {spesa && <input type="hidden" name="movementId" value={spesa.movementId} />}

      <div>
        <Label htmlFor="expense-title">{it.cassa.causaleSpesaLabel}</Label>
        <Input
          id="expense-title"
          name="title"
          placeholder={it.cassa.causaleSpesaEsempio}
          defaultValue={spesa?.title}
          maxLength={120}
          required
        />
      </div>

      <div>
        <Label htmlFor="perHead">{it.cassa.importoATestaLabel}</Label>
        <Input
          id="perHead"
          name="perHead"
          inputMode="decimal"
          placeholder={it.cassa.importoEsempio}
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          required
        />
      </div>

      <fieldset>
        <legend className="mb-1 block text-[17px] font-semibold">
          {it.cassa.partecipantiLabel}
        </legend>
        <div className="mb-2 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setSelected(new Set(members.map((m) => m.userId)))}
          >
            {it.cassa.tuttiPartecipanti}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setSelected(new Set())}
          >
            {it.cassa.nessunPartecipante}
          </Button>
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border-2 border-line p-2">
          {members.map((member) => (
            <li key={member.userId}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 text-[18px] hover:bg-accent-light/40">
                <input
                  type="checkbox"
                  name="participants"
                  value={member.userId}
                  checked={selected.has(member.userId)}
                  onChange={() => toggle(member.userId)}
                  className="size-6 accent-accent"
                />
                {member.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {totalCents !== null && (
        <p className="text-[17px] font-semibold">
          {it.cassa.totaleSpesa}: {formatEuroCents(totalCents)}{" "}
          <span className="font-normal text-ink-soft">
            ({selected.size}{" "}
            {selected.size === 1 ? it.cassa.partecipante : it.cassa.partecipanti} ×{" "}
            {formatEuroCents(perHeadCents ?? 0)} {it.cassa.aTesta})
          </span>
        </p>
      )}

      <SubmitButton>{spesa ? it.modificaPost.salva : it.cassa.registra}</SubmitButton>
    </form>
  );
}
