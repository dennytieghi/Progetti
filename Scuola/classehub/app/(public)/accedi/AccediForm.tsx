"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { accediAction } from "./actions";

export function AccediForm() {
  const [state, formAction] = useActionState(accediAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}
      <div>
        <Label htmlFor="email">{it.accedi.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={it.accedi.emailEsempio}
          autoComplete="email"
          required
        />
      </div>
      <SubmitButton size="lg">{it.accedi.invia}</SubmitButton>
    </form>
  );
}
