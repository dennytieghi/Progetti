import Link from "next/link";
import { Pin } from "lucide-react";
import { it } from "@/lib/i18n/it";
import { formatDateIt, formatShortDateIt } from "@/lib/format-date";
import type { PostRow } from "@/lib/db/types";

const TYPE_EMOJI: Record<PostRow["type"], string> = {
  notice: "📢",
  deadline: "⏰",
  poll: "🗳️",
  material: "📎",
};

/** Card di un post in bacheca: icona tipo, titolo grande, anteprima, data. */
export function PostCard({
  post,
  classCode,
}: {
  post: PostRow;
  classCode: string;
}) {
  return (
    <Link
      href={`/c/${classCode}/p/${post.slug}`}
      className="block rounded-2xl border border-line bg-paper p-5 shadow-sm transition-colors hover:border-accent"
    >
      {post.pinned && (
        <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent-light px-3 py-0.5 text-[15px] font-semibold text-accent-dark">
          <Pin className="size-4" aria-hidden /> {it.bacheca.fissato}
        </p>
      )}
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden>
          {TYPE_EMOJI[post.type]}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-soft">
            {it.postTypes[post.type]}
            {post.archived && ` · ${it.bacheca.archiviato}`}
          </p>
          <h3 className="text-[22px] font-semibold leading-snug">{post.title}</h3>
          {post.body && (
            <p className="mt-1 line-clamp-2 text-ink-soft">{post.body}</p>
          )}
          <p className="mt-2 text-[15px] text-ink-soft">
            {post.type === "deadline" && post.due_date
              ? `${it.bacheca.entroIl} ${formatDateIt(post.due_date)}`
              : formatShortDateIt(post.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}
