"use server";

import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getAuthUserById, getMembershipById } from "@/lib/db/queries";
import { approveMembership, rejectMembership } from "@/lib/db/mutations";
import { sendEmail } from "@/lib/email/send";
import { getBaseUrl } from "@/lib/base-url";
import { rejectMembershipSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/**
 * Approvazione/rifiuto iscrizioni: solo il rappresentante della classe.
 * La membership deve appartenere ALLA SUA classe ed essere pending.
 */

export async function approvaAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const membership = getMembershipById(str(formData, "membershipId"));
  if (
    !membership ||
    membership.class_id !== ctx.klass.id ||
    membership.status !== "pending"
  ) {
    return;
  }

  approveMembership(membership.id, ctx.user.id);

  const parent = getAuthUserById(membership.user_id);
  if (parent) {
    const baseUrl = await getBaseUrl();
    await sendEmail({
      to: parent.email,
      subject: it.email.approvatoOggetto,
      body: it.email.approvatoTesto(
        ctx.klass.name,
        `${baseUrl}/c/${ctx.klass.class_code}`
      ),
    });
  }

  revalidatePath(`/c/${classCode}/impostazioni/approvazioni`);
  revalidatePath(`/c/${classCode}/impostazioni`);
}

export async function rifiutaAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const membership = getMembershipById(str(formData, "membershipId"));
  if (
    !membership ||
    membership.class_id !== ctx.klass.id ||
    membership.status !== "pending"
  ) {
    return;
  }

  const parsed = rejectMembershipSchema.safeParse({ reason: formData.get("reason") });
  const reason = parsed.success ? parsed.data.reason : null;

  rejectMembership(membership.id, ctx.user.id, reason);

  const parent = getAuthUserById(membership.user_id);
  if (parent) {
    await sendEmail({
      to: parent.email,
      subject: it.email.rifiutatoOggetto,
      body: it.email.rifiutatoTesto(ctx.klass.name, reason),
    });
  }

  revalidatePath(`/c/${classCode}/impostazioni/approvazioni`);
  revalidatePath(`/c/${classCode}/impostazioni`);
}
