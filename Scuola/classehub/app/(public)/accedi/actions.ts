"use server";

import { redirect } from "next/navigation";
import { sendLoginLink } from "@/lib/auth/magic-link";
import { accediSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Porta di rientro: manda un NUOVO link a chi è già registrato.
 * Mai creare account; esito identico per email registrate e non
 * (anti-enumerazione, spec V1.5).
 */
export async function accediAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = accediSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  const { demoPath } = await sendLoginLink({
    email: parsed.data.email,
    displayName: "",
    intent: { kind: "login" },
    createUser: false,
  });

  redirect(
    demoPath
      ? `/accedi?inviato=1&demo=${encodeURIComponent(demoPath)}`
      : "/accedi?inviato=1"
  );
}
