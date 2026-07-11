import { it } from "@/lib/i18n/it";
import { formatDateIt } from "@/lib/format-date";
import type { PostRow } from "@/lib/db/types";

/**
 * Genera il messaggio pronto da incollare nel gruppo WhatsApp (ADR-002).
 * Esempio:
 *   ⏰ SCADENZA — Consegna moduli iscrizione mensa
 *   📅 Entro venerdì 12 dicembre
 *   Dettagli e come procedere:
 *   👉 classehub.app/c/A7K3M9/p/x8k2
 */

const TYPE_EMOJI: Record<PostRow["type"], string> = {
  notice: "📢",
  deadline: "⏰",
  poll: "🗳️",
  material: "📎",
};

export function formatPostForWhatsapp(input: {
  post: Pick<PostRow, "type" | "title" | "due_date" | "slug">;
  classCode: string;
  baseUrl: string;
  /** Per i sondaggi: fino a quando si può votare. */
  pollClosesAt?: string;
}): string {
  const { post, classCode, baseUrl } = input;
  const typeLabel = it.postTypes[post.type].toUpperCase();
  const url = `${baseUrl}/c/${classCode}/p/${post.slug}`;

  const lines: string[] = [`${TYPE_EMOJI[post.type]} ${typeLabel} — ${post.title}`];

  if (post.type === "deadline" && post.due_date) {
    lines.push(`📅 ${it.whatsapp.entro} ${formatDateIt(post.due_date)}`);
  }
  if (post.type === "poll" && input.pollClosesAt) {
    lines.push(`📅 ${it.bacheca.chiudeIl} ${formatDateIt(input.pollClosesAt)}`);
  }

  lines.push(post.type === "poll" ? it.whatsapp.votaQui : it.whatsapp.dettagli);
  lines.push(`👉 ${url}`);

  return lines.join("\n");
}

/**
 * Promemoria versamenti in cassa: il link porta alla scheda Cassa,
 * dove ogni genitore vede la PROPRIA quota (mai importi in chat).
 */
export function formatCassaReminderForWhatsapp(input: {
  classCode: string;
  className: string;
  baseUrl: string;
  coords: {
    iban: string | null;
    ibanHolder: string | null;
    paypal: string | null;
    satispay: string | null;
  } | null;
}): string {
  const url = `${input.baseUrl}/c/${input.classCode}/cassa`;
  const lines = [`💰 ${it.cassa.waTitolo} — ${input.className} — ${it.cassa.waServono}`, it.cassa.waTesto];

  const c = input.coords;
  if (c && (c.iban || c.paypal || c.satispay)) {
    lines.push(it.cassa.waPagaCosi);
    if (c.iban) {
      lines.push(
        `🏦 IBAN: ${c.iban}${c.ibanHolder ? ` (${it.cassa.comePagareIntestato} ${c.ibanHolder})` : ""}`
      );
    }
    if (c.paypal) lines.push(`💳 PayPal: ${c.paypal}`);
    if (c.satispay) lines.push(`📱 Satispay: ${c.satispay}`);
  }

  lines.push(it.cassa.waLink, `👉 ${url}`);
  return lines.join("\n");
}
