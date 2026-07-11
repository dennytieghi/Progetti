"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  requireActiveMembership,
  requireRepresentative,
} from "@/lib/auth/require-membership";
import { getCashMovementById, getMembership } from "@/lib/db/queries";
import {
  deleteCashMovement,
  recordCashDeposit,
  recordCashExpense,
  setClassStripeAccount,
  updateCashExpense,
} from "@/lib/db/mutations";
import { stripeClient, stripeEnabled } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/base-url";
import {
  cashDepositSchema,
  cashExpenseSchema,
  onlineDepositSchema,
} from "@/lib/validation/schemas";
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
  if (
    !movement ||
    movement.class_id !== ctx.klass.id ||
    movement.kind !== "expense" ||
    movement.source !== "manual"
  ) {
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

/**
 * Collega (o riprende il collegamento di) un conto Stripe Standard.
 * Il conto è DEL RAPPRESENTANTE: i soldi dei genitori arrivano lì,
 * ClasseHub non tocca mai il denaro. Al termine Stripe rimanda qui.
 */
export async function collegaStripeAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);
  const cassaUrl = `${await getBaseUrl()}/c/${encodeURIComponent(classCode)}/cassa`;
  if (!stripeEnabled()) redirect(`${cassaUrl}?stripe=errore`);

  let onboardingUrl: string | null = null;
  try {
    const stripe = stripeClient();
    let accountId = ctx.klass.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        country: "IT",
        email: ctx.user.email,
      });
      accountId = account.id;
      await setClassStripeAccount(ctx.klass.id, accountId);
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: `${cassaUrl}?stripe=ok`,
      refresh_url: `${cassaUrl}?stripe=riprova`,
    });
    onboardingUrl = link.url;
  } catch {
    onboardingUrl = null;
  }

  redirect(onboardingUrl ?? `${cassaUrl}?stripe=errore`);
}

/**
 * Versamento con carta del genitore: apre Stripe Checkout sul conto
 * collegato. La quota si registra SOLO al ritorno, dopo che la sessione
 * risulta pagata presso Stripe (pagina "conferma").
 */
export async function versaOnlineAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireActiveMembership(classCode);

  if (!stripeEnabled() || !ctx.klass.stripe_account_id) {
    return { error: it.cassa.stripeErrore };
  }

  const parsed = onlineDepositSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  const cassaUrl = `${await getBaseUrl()}/c/${encodeURIComponent(classCode)}/cassa`;
  let checkoutUrl: string | null = null;
  try {
    const session = await stripeClient().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: parsed.data.amount,
              product_data: {
                name: `${it.cassa.versaOnlineCausale} — ${ctx.klass.name}`,
              },
            },
          },
        ],
        // La conferma rilegge questi dati DA STRIPE, mai dal browser.
        metadata: { class_id: ctx.klass.id, user_id: ctx.user.id },
        success_url: `${cassaUrl}/conferma?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${cassaUrl}?annullato=1`,
      },
      { stripeAccount: ctx.klass.stripe_account_id }
    );
    checkoutUrl = session.url;
  } catch {
    // Tipico: onboarding del conto non completato (charges disabilitate).
    return { error: it.cassa.stripeNonPronto };
  }

  if (!checkoutUrl) return { error: it.cassa.stripeErrore };
  redirect(checkoutUrl);
}

export async function eliminaMovimentoAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const movementId = str(formData, "movementId");
  const movement = await getCashMovementById(movementId);
  // Si eliminano solo movimenti manuali della propria classe
  // (l'RLS impone comunque le stesse regole nel database).
  if (movement && movement.class_id === ctx.klass.id && movement.source === "manual") {
    await deleteCashMovement(movementId);
  }
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/cassa`);
}
