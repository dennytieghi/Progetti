import { Clock, Megaphone, Paperclip, Vote } from "lucide-react";
import type { PostRow } from "@/lib/db/types";

/**
 * Linguaggio visivo dei tipi di post (docs/DESIGN.md): icona su chip
 * a colore pieno, badge a pillola, bordo del colore di categoria al
 * hover. Testo scuro sul giallo (unica eccezione WCAG), bianco sugli
 * altri. Usato dalla card in bacheca e dalla scelta del tipo.
 */
export const POST_TYPE_STYLE: Record<
  PostRow["type"],
  { icon: typeof Megaphone; chip: string; badge: string; hover: string; action: string }
> = {
  notice: {
    icon: Megaphone,
    chip: "bg-avviso text-avviso-ink",
    badge: "bg-avviso text-avviso-ink",
    hover: "hover:border-avviso",
    action: "text-avviso-ink",
  },
  deadline: {
    icon: Clock,
    chip: "bg-scadenza text-white",
    badge: "bg-scadenza text-white",
    hover: "hover:border-scadenza",
    action: "text-scadenza",
  },
  poll: {
    icon: Vote,
    chip: "bg-sondaggio text-white",
    badge: "bg-sondaggio text-white",
    hover: "hover:border-sondaggio",
    action: "text-sondaggio",
  },
  material: {
    icon: Paperclip,
    chip: "bg-materiale text-white",
    badge: "bg-materiale text-white",
    hover: "hover:border-materiale",
    action: "text-materiale",
  },
};
