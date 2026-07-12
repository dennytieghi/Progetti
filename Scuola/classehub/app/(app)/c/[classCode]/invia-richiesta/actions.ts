"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { FEATURES } from "@/lib/features";
import { countRecentRequests } from "@/lib/db/queries";
import { createRequest } from "@/lib/db/mutations";
import { createRequestSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Il genitore scrive al rappresentante. Vincoli:
 * - membro attivo, non silenziato;
 * - massimo 5 richieste nelle ultime 24 ore (anti-spam).
 */
export async function inviaRichiestaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  // Zona richieste disabilitata (ADR-019): rifiuta anche le chiamate dirette.
  if (!FEATURES.richieste) return { error: it.common.erroreGenerico };

  const classCode = formData.get("classCode");
  const ctx = await requireActiveMembership(
    typeof classCode === "string" ? classCode : ""
  );

  if (ctx.membership.muted) return { error: it.errori.silenziato };

  const parsed = createRequestSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  if ((await countRecentRequests(ctx.klass.id, ctx.user.id)) >= 5) {
    return { error: it.richieste.limiteRaggiunto };
  }

  const created = await createRequest({
    classId: ctx.klass.id,
    authorId: ctx.user.id,
    body: parsed.data.body,
  });
  if (!created) return { error: it.common.erroreGenerico };

  revalidatePath(`/c/${ctx.klass.class_code}/invia-richiesta`);
  revalidatePath(`/c/${ctx.klass.class_code}/richieste`);
  redirect(`/c/${ctx.klass.class_code}/invia-richiesta?inviata=1`);
}
