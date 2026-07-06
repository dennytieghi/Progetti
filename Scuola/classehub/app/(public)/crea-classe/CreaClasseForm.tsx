"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Banner } from "@/components/shared/Banner";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { creaClasseAction } from "./actions";

export function CreaClasseForm() {
  const [state, formAction] = useActionState(creaClasseAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <div>
        <Label htmlFor="className">{it.creaClasse.nomeClasseLabel}</Label>
        <Input
          id="className"
          name="className"
          placeholder={it.creaClasse.nomeClasseEsempio}
          required
        />
      </div>

      <div>
        <Label htmlFor="displayName">{it.creaClasse.nomeTuoLabel}</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder={it.creaClasse.nomeTuoEsempio}
          autoComplete="name"
          required
        />
      </div>

      <div>
        <Label htmlFor="email">{it.creaClasse.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={it.creaClasse.emailEsempio}
          autoComplete="email"
          required
        />
        <p className="mt-1.5 text-[15px] text-ink-soft">{it.creaClasse.emailSpiega}</p>
      </div>

      <SubmitButton>{it.creaClasse.invia}</SubmitButton>
    </form>
  );
}
