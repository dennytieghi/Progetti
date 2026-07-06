"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Banner } from "@/components/shared/Banner";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { inviaRichiestaAction } from "./actions";

export function RichiestaForm({ classCode }: { classCode: string }) {
  const [state, formAction] = useActionState(inviaRichiestaAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <input type="hidden" name="classCode" value={classCode} />

      <div>
        <Label htmlFor="body">{it.richieste.testoLabel}</Label>
        <Textarea
          id="body"
          name="body"
          placeholder={it.richieste.testoEsempio}
          maxLength={1000}
          required
        />
      </div>

      <SubmitButton>{it.richieste.invia}</SubmitButton>
    </form>
  );
}
