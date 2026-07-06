"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Banner } from "@/components/shared/Banner";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { votaAction } from "@/app/(app)/c/[classCode]/p/[postSlug]/actions";

/** Form di voto: checkbox grandi (touch ≥48px), voto anonimo. */
export function PollVoteForm({
  classCode,
  slug,
  options,
}: {
  classCode: string;
  slug: string;
  options: Array<{ id: string; label: string }>;
}) {
  const [state, formAction] = useActionState(votaAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <input type="hidden" name="classCode" value={classCode} />
      <input type="hidden" name="slug" value={slug} />

      <p className="text-[16px] text-ink-soft">{it.sondaggio.votaSpiega}</p>

      <fieldset className="space-y-2">
        <legend className="sr-only">{it.postTypes.poll}</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-line bg-paper px-4 py-3 has-checked:border-accent has-checked:bg-accent-light"
          >
            <input
              type="checkbox"
              name="optionIds"
              value={option.id}
              className="size-6 shrink-0 accent-(--color-accent)"
            />
            <span className="text-[18px]">{option.label}</span>
          </label>
        ))}
      </fieldset>

      <SubmitButton>{it.sondaggio.vota}</SubmitButton>
    </form>
  );
}
