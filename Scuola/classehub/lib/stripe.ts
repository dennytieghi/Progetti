import "server-only";
import Stripe from "stripe";

/**
 * Pagamenti con carta via Stripe Connect (modello Standard):
 * ogni classe collega un conto Stripe del rappresentante e i versamenti
 * dei genitori vanno DIRETTAMENTE su quel conto, mai su ClasseHub.
 *
 * Senza STRIPE_SECRET_KEY in .env.local tutta la parte carta sparisce
 * dall'interfaccia e la cassa funziona solo in contanti.
 */

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY mancante in .env.local (vedi docs/SETUP.md).");
  }
  return new Stripe(key);
}

/** Il conto collegato può già incassare? (onboarding completato) */
export async function isAccountReady(stripeAccountId: string): Promise<boolean> {
  const account = await stripeClient().accounts.retrieve(stripeAccountId);
  return account.charges_enabled === true;
}
