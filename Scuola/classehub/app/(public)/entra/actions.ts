"use server";

import { redirect } from "next/navigation";
import { getClassByCode } from "@/lib/db/queries";
import { sendLoginLink } from "@/lib/auth/magic-link";
import { joinClassSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Passo 1 dell'onboarding genitore: valida il codice classe e invia
 * il magic link. La membership pending nasce SOLO dopo il click sul
 * link (email verificata), nel callback (PROJECT_SPEC §Onboarding).
 *
 * Chi è già membro o già in attesa e rifà il form riceve comunque il
 * link: al click il callback lo porta in bacheca (se attivo) o alla
 * schermata d'attesa, senza duplicare nulla. Con Supabase le email non
 * sono consultabili prima del login, quindi il controllo anticipato
 * del PoC non è più possibile.
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

  const klass = await getClassByCode(parsed.data.classCode);
  if (!klass) {
    return { error: it.entra.erroreCodice };
  }

  const { demoPath } = await sendLoginLink({
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    intent: {
      kind: "join_class",
      classId: klass.id,
      noteForRep: parsed.data.note || null,
    },
  });

  redirect(
    demoPath ? `/controlla-email?demo=${encodeURIComponent(demoPath)}` : "/controlla-email"
  );
}
