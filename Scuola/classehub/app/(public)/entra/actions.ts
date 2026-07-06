"use server";

import { redirect } from "next/navigation";
import { getAuthUserByEmail, getClassByCode, getMembership } from "@/lib/db/queries";
import { createMagicLink } from "@/lib/db/mutations";
import { sendEmail } from "@/lib/email/send";
import { getBaseUrl } from "@/lib/base-url";
import { joinClassSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Passo 1 dell'onboarding genitore: valida il codice classe e "invia"
 * il magic link. La membership pending nasce SOLO dopo il click sul
 * link (email verificata), nel callback (PROJECT_SPEC §Onboarding genitore).
 */
export async function entraAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = joinClassSchema.safeParse({
    classCode: formData.get("classCode"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  const klass = getClassByCode(parsed.data.classCode);
  if (!klass) {
    return { error: it.entra.erroreCodice };
  }

  // Se questa email ha già una membership, evita richieste doppie.
  const existingUser = getAuthUserByEmail(parsed.data.email);
  if (existingUser) {
    const membership = getMembership(existingUser.id, klass.id);
    if (membership?.status === "active") return { error: it.entra.giaMembro };
    if (membership?.status === "pending") return { error: it.entra.giaRichiesta };
  }

  const link = createMagicLink({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    payload: {
      kind: "join_class",
      class_id: klass.id,
      note_for_rep: parsed.data.note,
    },
  });

  const baseUrl = await getBaseUrl();
  await sendEmail({
    to: parsed.data.email,
    subject: it.email.magicLinkOggetto,
    body: it.email.magicLinkTesto(`${baseUrl}/auth/callback?token=${link.token}`),
  });

  redirect(`/controlla-email?demo=${link.token}`);
}
