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
