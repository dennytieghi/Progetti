"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { modificaPostAction } from "./actions";

export function ModificaPostForm({
  classCode,
  slug,
  isDeadline,
  defaults,
}: {
  classCode: string;
  slug: string;
  isDeadline: boolean;
  defaults: { title: string; body: string; dueDate: string };
}) {
  const [state, formAction] = useActionState(modificaPostAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <input type="hidden" name="classCode" value={classCode} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <Label htmlFor="title">{it.nuovo.titoloLabel}</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaults.title}
          maxLength={120}
          required
        />
      </div>

      {isDeadline && (
        <div>
          <Label htmlFor="dueDate">{it.nuovo.dataLabel}</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={defaults.dueDate} required />
        </div>
      )}

      <div>
        <Label htmlFor="body">{it.nuovo.testoLabel}</Label>
        <Textarea
          id="body"
          name="body"
          defaultValue={defaults.body}
          maxLength={5000}
          rows={8}
        />
      </div>

      <SubmitButton>{it.modificaPost.salva}</SubmitButton>
    </form>
  );
}
