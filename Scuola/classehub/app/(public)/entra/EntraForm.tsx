"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Banner } from "@/components/shared/Banner";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { entraAction } from "./actions";

export function EntraForm({ prefilledCode }: { prefilledCode: string }) {
  const [state, formAction] = useActionState(entraAction, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <div>
        <Label htmlFor="classCode">{it.entra.codiceLabel}</Label>
        <Input
          id="classCode"
          name="classCode"
          placeholder={it.entra.codiceEsempio}
          defaultValue={prefilledCode}
          autoCapitalize="characters"
          autoComplete="off"
          className="uppercase tracking-widest"
          maxLength={8}
          required
        />
      </div>

      <div>
        <Label htmlFor="displayName">{it.entra.nomeLabel}</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder={it.entra.nomeEsempio}
          autoComplete="name"
          required
        />
        <p className="mt-1.5 text-[15px] text-ink-soft">{it.entra.nomeSpiega}</p>
      </div>

      <div>
        <Label htmlFor="email">{it.entra.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={it.entra.emailEsempio}
          autoComplete="email"
          required
        />
        <p className="mt-1.5 text-[15px] text-ink-soft">{it.entra.emailSpiega}</p>
      </div>

      <div>
        <Label htmlFor="note">{it.entra.notaLabel}</Label>
        <Textarea
          id="note"
          name="note"
          placeholder={it.entra.notaEsempio}
          className="min-h-24"
          maxLength={300}
        />
        <p className="mt-1.5 text-[15px] text-ink-soft">{it.entra.notaSpiega}</p>
      </div>

      <SubmitButton>{it.entra.invia}</SubmitButton>
    </form>
  );
}
