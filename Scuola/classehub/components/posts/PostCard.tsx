import Link from "next/link";
import { ArrowRight, Pin } from "lucide-react";
import { POST_TYPE_STYLE } from "@/components/posts/type-style";
import { it } from "@/lib/i18n/it";
import { formatDateIt, formatShortDateIt } from "@/lib/format-date";
import { cn } from "@/lib/cn";
import type { PostRow } from "@/lib/db/types";

/**
 * Card di un post nel feed (docs/DESIGN.md §Card post): icona in chip
 * colorato per tipo, badge a pillola, al hover il bordo prende il
 * colore di categoria e compare l'azione "Apri"/"Vota". L'urgenza
 * (in evidenza) è SOLO un'etichetta rossa piccola, mai un secondo
 * blocco di colore sulla card.
 */

export function PostCard({
  post,
  classCode,
}: {
  post: PostRow;
  classCode: string;
}) {
  const stile = POST_TYPE_STYLE[post.type];
  const Icona = stile.icon;

  return (
    <Link
      href={`/c/${classCode}/p/${post.slug}`}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-hairline bg-paper p-4",
        "transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(20,20,30,0.08)]",
        stile.hover
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[34px] shrink-0 items-center justify-center rounded-[10px]",
          stile.chip
        )}
      >
        <Icona className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[15px] font-bold uppercase tracking-[0.03em]",
              stile.badge
            )}
          >
            {it.postTypes[post.type]}
          </span>
          {post.pinned && (
            <span className="ml-auto flex items-center gap-1 text-[15px] font-bold text-urgente">
              <Pin className="size-4" aria-hidden /> {it.bacheca.fissato}
            </span>
          )}
        </span>
        <span className="mt-1.5 block font-display text-[22px] font-semibold leading-snug">
          {post.title}
        </span>
        {post.body && (
          <span className="mt-0.5 line-clamp-2 block leading-relaxed text-ink-soft">
            {post.body}
          </span>
        )}
        <span className="mt-1.5 block text-[15px] text-ink-faint">
          {post.type === "deadline" && post.due_date
            ? `${it.bacheca.entroIl} ${formatDateIt(post.due_date)}`
            : formatShortDateIt(post.created_at)}
          {post.archived && ` · ${it.bacheca.archiviato}`}
        </span>
      </span>

      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center gap-1 self-center text-[16px] font-bold",
          "opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 -translate-x-1",
          stile.action
        )}
      >
        {post.type === "poll" ? it.bacheca.vota : it.bacheca.apri}
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
