import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { recordStripeDeposit } from "@/lib/db/mutations";
import { stripeClient, stripeEnabled } from "@/lib/stripe";
import { it } from "@/lib/i18n/it";

/**
 * Ritorno da Stripe Checkout. La verità sta da Stripe: la sessione viene
 * riletta con la chiave segreta e la quota si registra solo se risulta
 * pagata E appartiene a questa classe. Idempotente: ricaricare la pagina
 * non crea un secondo movimento (vincolo unique su stripe_session_id).
 */
export default async function ConfermaPagamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { classCode } = await params;
  const { session_id: sessionId } = await searchParams;
  const ctx = await requireActiveMembership(classCode);

  const cassaUrl = `/c/${encodeURIComponent(classCode)}/cassa`;
  if (!sessionId || !stripeEnabled() || !ctx.klass.stripe_account_id) {
    redirect(cassaUrl);
  }

  let registrato = false;
  try {
    const session = await stripeClient().checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: ctx.klass.stripe_account_id }
    );
    const parentId = session.metadata?.user_id;
    const amountCents = session.amount_total ?? 0;
    if (
      session.payment_status === "paid" &&
      session.metadata?.class_id === ctx.klass.id &&
      parentId &&
      amountCents > 0
    ) {
      await recordStripeDeposit({
        classId: ctx.klass.id,
        parentId,
        amountCents,
        title: it.cassa.versaOnlineCausale,
        stripeSessionId: session.id,
      });
      registrato = true;
    }
  } catch {
    registrato = false;
  }

  redirect(`${cassaUrl}?${registrato ? "pagato=1" : "errore=1"}`);
}
