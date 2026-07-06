"use server";

import { redirect } from "next/navigation";
import { createMagicLink } from "@/lib/db/mutations";
import { sendEmail } from "@/lib/email/send";
import { getBaseUrl } from "@/lib/base-url";
import { createClassSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Passo 1 dell'onboarding rappresentante: valida i dati e "invia"
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

  const link = createMagicLink({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    payload: { kind: "create_class", class_name: parsed.data.className },
  });

  const baseUrl = await getBaseUrl();
  await sendEmail({
    to: parsed.data.email,
    subject: it.email.magicLinkOggetto,
    body: it.email.magicLinkTesto(`${baseUrl}/auth/callback?token=${link.token}`),
  });

  redirect(`/controlla-email?demo=${link.token}`);
}
