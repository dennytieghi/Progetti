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
