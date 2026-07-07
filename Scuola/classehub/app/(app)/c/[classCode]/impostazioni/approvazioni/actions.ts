"use server";

import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getUserEmailById, getMembershipById } from "@/lib/db/queries";
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

  const membership = await getMembershipById(str(formData, "membershipId"));
  if (
    !membership ||
    membership.class_id !== ctx.klass.id ||
    membership.status !== "pending"
  ) {
    return;
  }

  await approveMembership(membership.id, ctx.user.id);

  const parentEmail = await getUserEmailById(membership.user_id);
  if (parentEmail) {
    const baseUrl = await getBaseUrl();
    await sendEmail({
      to: parentEmail,
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

  const membership = await getMembershipById(str(formData, "membershipId"));
  if (
    !membership ||
    membership.class_id !== ctx.klass.id ||
    membership.status !== "pending"
  ) {
    return;
  }

  const parsed = rejectMembershipSchema.safeParse({ reason: formData.get("reason") });
  const reason = parsed.success ? parsed.data.reason : null;

  await rejectMembership(membership.id, ctx.user.id, reason);

  const parentEmail = await getUserEmailById(membership.user_id);
  if (parentEmail) {
    await sendEmail({
      to: parentEmail,
      subject: it.email.rifiutatoOggetto,
      body: it.email.rifiutatoTesto(ctx.klass.name, reason),
    });
  }

  revalidatePath(`/c/${classCode}/impostazioni/approvazioni`);
  revalidatePath(`/c/${classCode}/impostazioni`);
}
