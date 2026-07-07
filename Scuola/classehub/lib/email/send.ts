import "server-only";

/**
 * Invio email transazionali (approvato/rifiutato/rimosso).
 * In sviluppo finiscono solo nel log del server.
 * Produzione: sostituire il corpo con una chiamata a Resend
 * (RESEND_API_KEY, vedi docs/SETUP.md). La firma resta.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  console.log(`[email demo] a: ${input.to} — ${input.subject}\n${input.body}`);
}
