"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getCashMovementById, getMembership } from "@/lib/db/queries";
import {
  deleteCashMovement,
  recordCashDeposit,
  recordCashExpense,
  updateCashExpense,
} from "@/lib/db/mutations";
import { cashDepositSchema, cashExpenseSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

/**
 * Movimenti manuali della cassa: SOLO rappresentante attivo.
 * Oltre alla guardia, ogni intestatario viene verificato come membro
 * attivo della classe: mai quote intestate a estranei o a pending.
 */

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function isActiveMemberOfClass(userId: string, classId: string): Promise<boolean> {
  const membership = await getMembership(userId, classId);
  return membership !== null && membership.status === "active";
}

function finish(classCode: string): never {
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/cassa?fatto=1`);
}

export async function registraVersamentoAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const parsed = cashDepositSchema.safeParse({
    parentId: formData.get("parentId"),
    amount: formData.get("amount"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  if (!(await isActiveMemberOfClass(parsed.data.parentId, ctx.klass.id))) {
    return { error: it.cassa.erroreGenitore };
  }

  await recordCashDeposit({
    classId: ctx.klass.id,
    representativeId: ctx.user.id,
    parentId: parsed.data.parentId,
    amountCents: parsed.data.amount,
    title: parsed.data.title,
  });
  finish(classCode);
}

export async function registraSpesaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const participantIds = formData
    .getAll("participants")
    .filter((p): p is string => typeof p === "string");

  const parsed = cashExpenseSchema.safeParse({
    title: formData.get("title"),
    perHead: formData.get("perHead"),
    participantIds,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  for (const participantId of parsed.data.participantIds) {
    if (!(await isActiveMemberOfClass(participantId, ctx.klass.id))) {
      return { error: it.cassa.errorePartecipanti };
    }
  }

  await recordCashExpense({
    classId: ctx.klass.id,
    representativeId: ctx.user.id,
    title: parsed.data.title,
    perHeadCents: parsed.data.perHead,
    participantIds: parsed.data.participantIds,
  });
  finish(classCode);
}

/**
 * Modifica di una spesa manuale: causale, importo a testa, partecipanti
 * (per il genitore aggiunto all'ultimo o l'importo cambiato).
 */
export async function modificaSpesaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const movement = await getCashMovementById(str(formData, "movementId"));
  if (!movement || movement.class_id !== ctx.klass.id || movement.kind !== "expense") {
    return { error: it.cassa.spesaNonTrovata };
  }

  const participantIds = formData
    .getAll("participants")
    .filter((p): p is string => typeof p === "string");

  const parsed = cashExpenseSchema.safeParse({
    title: formData.get("title"),
    perHead: formData.get("perHead"),
    participantIds,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  for (const participantId of parsed.data.participantIds) {
    if (!(await isActiveMemberOfClass(participantId, ctx.klass.id))) {
      return { error: it.cassa.errorePartecipanti };
    }
  }

  await updateCashExpense({
    movementId: movement.id,
    title: parsed.data.title,
    perHeadCents: parsed.data.perHead,
    participantIds: parsed.data.participantIds,
  });
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/cassa?modificata=1`);
}

export async function eliminaMovimentoAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const movementId = str(formData, "movementId");
  const movement = await getCashMovementById(movementId);
  // Si elimina solo un movimento della propria classe (l'RLS impone
  // comunque le stesse regole nel database).
  if (movement && movement.class_id === ctx.klass.id) {
    await deleteCashMovement(movementId);
  }
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/cassa`);
}
