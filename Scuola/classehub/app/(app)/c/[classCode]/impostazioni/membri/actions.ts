"use server";

import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getUserEmailById, getMembershipById } from "@/lib/db/queries";
import { removeMembership, setMuted } from "@/lib/db/mutations";
import { sendEmail } from "@/lib/email/send";
import { it } from "@/lib/i18n/it";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Verifica che la membership sia un genitore attivo DELLA classe. */
async function getTargetParent(formData: FormData) {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);
  const membership = await getMembershipById(str(formData, "membershipId"));
  if (
    !membership ||
    membership.class_id !== ctx.klass.id ||
    membership.status !== "active" ||
    membership.role === "representative"
  ) {
    return null;
  }
  return { ctx, membership, classCode };
}

/** Silenzia/riattiva: il genitore legge ma non vota né invia richieste. */
export async function toggleMuteAction(formData: FormData): Promise<void> {
  const target = await getTargetParent(formData);
  if (!target) return;
  await setMuted(target.membership.id, !target.membership.muted);
  revalidatePath(`/c/${target.classCode}/impostazioni/membri`);
}

/** Rimozione soft (status 'removed') + email di notifica al genitore. */
export async function rimuoviAction(formData: FormData): Promise<void> {
  const target = await getTargetParent(formData);
  if (!target) return;

  await removeMembership(target.membership.id, target.ctx.user.id);

  const parentEmail = await getUserEmailById(target.membership.user_id);
  if (parentEmail) {
    await sendEmail({
      to: parentEmail,
      subject: it.email.rimossoOggetto,
      body: it.email.rimossoTesto(target.ctx.klass.name),
    });
  }

  revalidatePath(`/c/${target.classCode}/impostazioni/membri`);
}
