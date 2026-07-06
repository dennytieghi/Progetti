import "server-only";
import { mutateDb, newId, nowIso } from "@/lib/db/store";

/**
 * Invio email transazionali (approvato/rifiutato/rimosso).
 * PoC: le email finiscono in .data/db.json (outbox) e nel log del server.
 * Produzione: sostituire il corpo di sendEmail con una chiamata a Resend
 * (o alle email di Supabase Auth per i soli magic link). La firma resta.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  mutateDb((db) => {
    db.outbox.push({
      id: newId(),
      to: input.to,
      subject: input.subject,
      body: input.body,
      sent_at: nowIso(),
    });
  });
  console.log(`[email demo] a: ${input.to} — ${input.subject}\n${input.body}`);
}
