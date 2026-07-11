"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { versaOnlineAction } from "./actions";

export function VersaOnlineForm({ classCode }: { classCode: string }) {
  const [state, formAction] = useActionState(versaOnlineAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <input type="hidden" name="classCode" value={classCode} />

      <div>
        <Label htmlFor="online-amount">{it.cassa.importoLabel}</Label>
        <Input
          id="online-amount"
          name="amount"
          inputMode="decimal"
          placeholder={it.cassa.importoEsempio}
          required
        />
      </div>

      <SubmitButton>{it.cassa.versaOnlineBottone}</SubmitButton>
    </form>
  );
}
