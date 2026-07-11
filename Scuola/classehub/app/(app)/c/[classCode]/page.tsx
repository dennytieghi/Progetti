import Link from "next/link";
import { Plus } from "lucide-react";
import { PostCard } from "@/components/posts/PostCard";
import { Banner } from "@/components/shared/Banner";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { listPosts, listUpcomingDeadlines } from "@/lib/db/queries";
import { formatDateIt } from "@/lib/format-date";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import type { PostType } from "@/lib/db/types";

export const metadata = { title: `${it.bacheca.titolo} — ${it.app.name}` };

const FILTERS: Array<{ key: string; label: string; type: PostType | null }> = [
  { key: "tutti", label: it.bacheca.filtroTutti, type: null },
  { key: "notice", label: it.postTypes.notice, type: "notice" },
  { key: "deadline", label: it.postTypes.deadline, type: "deadline" },
  { key: "poll", label: it.postTypes.poll, type: "poll" },
  { key: "material", label: it.postTypes.material, type: "material" },
];

/** Home bacheca: scadenze in cima, poi il resto (PROJECT_SPEC §user stories). */
export default async function BachecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ tipo?: string; archiviati?: string; eliminato?: string }>;
}) {
  const { classCode } = await params;
  const { tipo, archiviati, eliminato } = await searchParams;
  const ctx = await requireActiveMembership(classCode);

  const showArchived = ctx.isRepresentative && archiviati === "1";
  const activeFilter = FILTERS.find((f) => f.key === tipo) ?? FILTERS[0]!;

  const deadlines = await listUpcomingDeadlines(ctx.klass.id);
  const posts = (
    await listPosts(ctx.klass.id, { includeArchived: showArchived })
  ).filter((p) => (activeFilter.type ? p.type === activeFilter.type : true));

  return (
    <div className="space-y-8">
      {eliminato === "1" && ctx.isRepresentative && (
        <div aria-live="polite">
          <Banner tone="success">{it.bacheca.eliminato}</Banner>
        </div>
      )}

      {deadlines.length > 0 && (
        <section aria-label={it.bacheca.prossimeScadenze}>
          <h2 className="mb-3 text-[24px] font-bold">{it.bacheca.prossimeScadenze}</h2>
          <ul className="space-y-2">
            {deadlines.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/c/${classCode}/p/${post.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning-light px-4 py-3 hover:border-warning"
                >
                  <span className="text-2xl" aria-hidden>
                    ⏰
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug">
                      {post.title}
                    </span>
                    <span className="text-[15px] text-warning">
                      {it.bacheca.entroIl} {formatDateIt(post.due_date!)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label={it.bacheca.ultimeNovita}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[24px] font-bold">{it.bacheca.ultimeNovita}</h2>
          {ctx.isRepresentative && (
            <Link href={`/c/${classCode}/nuovo`} className={buttonClasses("primary", "md")}>
              <Plus className="size-5" aria-hidden /> {it.bacheca.nuovoPost}
            </Link>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={
                f.key === "tutti"
                  ? `/c/${classCode}`
                  : `/c/${classCode}?tipo=${f.key}${showArchived ? "&archiviati=1" : ""}`
              }
              className={cn(
                "min-h-12 rounded-full border-2 px-4 py-2.5 text-[16px] font-semibold",
                f.key === activeFilter.key
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-paper text-ink-soft hover:border-accent"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {ctx.isRepresentative && (
          <p className="mb-4">
            <Link
              href={
                showArchived
                  ? `/c/${classCode}${tipo && tipo !== "tutti" ? `?tipo=${tipo}` : ""}`
                  : `/c/${classCode}?${tipo && tipo !== "tutti" ? `tipo=${tipo}&` : ""}archiviati=1`
              }
              className="text-[16px] font-semibold text-accent underline underline-offset-4"
            >
              {showArchived ? it.bacheca.soloAttivi : it.bacheca.archiviati}
            </Link>
          </p>
        )}

        {posts.length === 0 ? (
          <EmptyState
            emoji="📭"
            title={it.bacheca.vuotaTitolo}
            text={ctx.isRepresentative ? it.bacheca.vuotaTestoRep : it.bacheca.vuotaTesto}
          >
            {ctx.isRepresentative && (
              <Link href={`/c/${classCode}/nuovo`} className={buttonClasses("primary", "md")}>
                <Plus className="size-5" aria-hidden /> {it.bacheca.nuovoPost}
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} classCode={classCode} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
