"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { registraVersamentoAction } from "./actions";
import { METODI } from "./DichiaraVersamentoForm";

export interface MemberOption {
  userId: string;
  name: string;
}

export function VersamentoForm({
  classCode,
  members,
}: {
  classCode: string;
  members: MemberOption[];
}) {
  const [state, formAction] = useActionState(registraVersamentoAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <input type="hidden" name="classCode" value={classCode} />

      <div>
        <Label htmlFor="parentId">{it.cassa.genitoreLabel}</Label>
        <select
          id="parentId"
          name="parentId"
          required
          defaultValue=""
          className="min-h-12 w-full rounded-xl border-2 border-line bg-paper px-4 text-[18px] focus:border-accent focus:outline-none"
        >
          <option value="" disabled>
            {it.cassa.genitoreScegli}
          </option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="amount">{it.cassa.importoLabel}</Label>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder={it.cassa.importoEsempio}
          required
        />
      </div>

      <div>
        <Label htmlFor="method">{it.cassa.metodoLabelRep}</Label>
        <select
          id="method"
          name="method"
          required
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

      <div>
        <Label htmlFor="deposit-title">{it.cassa.causaleVersamentoLabel}</Label>
        <Input
          id="deposit-title"
          name="title"
          placeholder={it.cassa.causaleVersamentoEsempio}
          maxLength={120}
        />
      </div>

      <SubmitButton>{it.cassa.registra}</SubmitButton>
    </form>
  );
}
