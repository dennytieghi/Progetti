import Link from "next/link";
import { ArrowRight, Pin, Plus } from "lucide-react";
import { PostCard } from "@/components/posts/PostCard";
import { POST_TYPE_STYLE } from "@/components/posts/type-style";
import { Banner } from "@/components/shared/Banner";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { formatDateIt, formatShortDateIt } from "@/lib/format-date";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import type { PostType } from "@/lib/db/types";
import { caricaDatiBacheca } from "./bacheca-dati";
import { PannelloBacheca } from "./PannelloBacheca";

export const metadata = { title: `${it.bacheca.titolo} — ${it.app.name}` };

const FILTERS: Array<{ key: string; label: string; type: PostType | null }> = [
  { key: "tutti", label: it.bacheca.filtroTutti, type: null },
  { key: "notice", label: it.postTypes.notice, type: "notice" },
  { key: "deadline", label: it.postTypes.deadline, type: "deadline" },
  { key: "poll", label: it.postTypes.poll, type: "poll" },
  { key: "material", label: it.postTypes.material, type: "material" },
];

/** Home bacheca (docs/DESIGN.md): pannello riepilogo, poi il feed. */
export default async function BachecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{
    tipo?: string;
    vista?: string;
    archiviati?: string;
    eliminato?: string;
  }>;
}) {
  const { classCode } = await params;
  const { tipo, vista, archiviati, eliminato } = await searchParams;
  const ctx = await requireActiveMembership(classCode);

  const showArchived = ctx.isRepresentative && archiviati === "1";
  const activeFilter = FILTERS.find((f) => f.key === tipo) ?? FILTERS[0]!;

  const dati = await caricaDatiBacheca(ctx, { includeArchived: showArchived });
  const { allPosts, evidenzaPosts, nuoviPosts, deadlines, sondaggiAperti } = dati;

  // La vista (dal click su un segmento) vince sul filtro per tipo.
  const VISTE: Record<string, { label: string; posts: typeof allPosts }> = {
    nuovi: { label: it.bacheca.statAvvisiNuovi, posts: nuoviPosts },
    scadenze: { label: it.bacheca.statScadenzeAperte, posts: deadlines },
    sondaggi: { label: it.bacheca.statSondaggiAperti, posts: sondaggiAperti },
  };
  const vistaAttiva = vista ? (VISTE[vista] ?? null) : null;
  const posts = vistaAttiva
    ? vistaAttiva.posts
    : allPosts.filter((p) => (activeFilter.type ? p.type === activeFilter.type : true));
  const chipAttivo = vistaAttiva ? null : activeFilter.key;

  const nome = (ctx.profile?.display_name ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="font-body">
      {eliminato === "1" && ctx.isRepresentative && (
        <div aria-live="polite" className="mb-4">
          <Banner tone="success">{it.bacheca.eliminato}</Banner>
        </div>
      )}

      {/* Pannello riepilogo: delimitato, non si confonde col feed */}
      <PannelloBacheca
        classCode={classCode}
        nome={nome}
        isRepresentative={ctx.isRepresentative}
        dati={dati}
        attiva="annunci"
      />

      {/* Separatore: qui iniziano i contenuti */}
      <div className="mb-4 mt-[26px] flex items-center gap-2.5">
        <span className="whitespace-nowrap text-[15px] font-bold uppercase tracking-[0.07em] text-ink-faint">
          {it.bacheca.titolo}
        </span>
        <span aria-hidden className="h-px flex-1 bg-hairline" />
      </div>

      {/* Messaggi in evidenza: box colorati sopra i filtri */}
      {evidenzaPosts.length > 0 && (
        <ul className="mb-4 space-y-2.5">
          {evidenzaPosts.map((post) => {
            const stile = POST_TYPE_STYLE[post.type];
            return (
              <li key={post.id}>
                <Link
                  href={`/c/${classCode}/p/${post.slug}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3",
                    "transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(20,20,30,0.08)]",
                    stile.pinBox,
                    stile.hover
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-[34px] shrink-0 items-center justify-center rounded-full",
                      stile.pinBadge
                    )}
                  >
                    <Pin className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b
                      className={cn(
                        "block text-[18px] leading-snug",
                        stile.pinText
                      )}
                    >
                      {post.title}
                    </b>
                    <span className={cn("text-[15px] opacity-85", stile.pinText)}>
                      {post.type === "deadline" && post.due_date
                        ? `${it.bacheca.entroIl} ${formatDateIt(post.due_date)}`
                        : formatShortDateIt(post.created_at)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex shrink-0 items-center gap-1 self-center text-[16px] font-bold",
                      "-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100",
                      stile.pinText
                    )}
                  >
                    {post.type === "poll" ? it.bacheca.vota : it.bacheca.apri}
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {vistaAttiva && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-[16px] text-ink-soft">
          {it.bacheca.vistaAttiva.replace("{label}", vistaAttiva.label)}{" "}
          <Link
            href={`/c/${classCode}`}
            className="font-semibold text-brand underline underline-offset-4"
          >
            {it.bacheca.vistaMostraTutto}
          </Link>
        </p>
      )}

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
              "min-h-12 rounded-full border px-4 py-2.5 text-[16px] font-semibold",
              f.key === chipAttivo
                ? "border-brand bg-brand text-white"
                : "border-hairline bg-paper text-ink-soft hover:border-brand hover:text-ink"
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
            className="text-[16px] font-semibold text-brand underline underline-offset-4"
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
        <ul className="space-y-2.5">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} classCode={classCode} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
