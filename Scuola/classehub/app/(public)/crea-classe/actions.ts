"use server";

import { redirect } from "next/navigation";
import { sendLoginLink } from "@/lib/auth/magic-link";
import { createClassSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Passo 1 dell'onboarding rappresentante: valida i dati e invia
 * il magic link. La classe viene creata SOLO dopo il click sul link
 * (email verificata), nel callback.
 */
export async function creaClasseAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = createClassSchema.safeParse({
    className: formData.get("className"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  const { demoPath } = await sendLoginLink({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    intent: { kind: "create_class", className: parsed.data.className },
  });

  redirect(
    demoPath ? `/controlla-email?demo=${encodeURIComponent(demoPath)}` : "/controlla-email"
  );
}
