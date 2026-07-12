import Link from "next/link";
import { Pin, Plus } from "lucide-react";
import { PostCard } from "@/components/posts/PostCard";
import { Banner } from "@/components/shared/Banner";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { listPollVotes, listPosts, listUpcomingDeadlines } from "@/lib/db/queries";
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

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;

/** Home bacheca (docs/DESIGN.md): pannello riepilogo, poi il feed. */
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
  const allPosts = await listPosts(ctx.klass.id, { includeArchived: showArchived });
  const posts = allPosts.filter((p) =>
    activeFilter.type ? p.type === activeFilter.type : true
  );

  // Statistiche del pannello riepilogo, dai dati già caricati.
  // "Nuovo" = pubblicato negli ultimi 7 giorni.
  const attivi = allPosts.filter((p) => !p.archived);
  const inEvidenza = attivi.filter((p) => p.pinned).length;
  const sogliaNuovi = Date.now() - SETTE_GIORNI_MS;
  const avvisiNuovi = attivi.filter(
    (p) => p.type === "notice" && new Date(p.created_at).getTime() >= sogliaNuovi
  ).length;
  // I voti visibili dipendono dall'RLS: un genitore che non ha ancora
  // votato non vede i voti degli altri (per lui il numero è più basso).
  const votiPerSondaggio = await Promise.all(
    attivi.filter((p) => p.type === "poll").map((p) => listPollVotes(p.id))
  );
  const votiSondaggi = votiPerSondaggio.reduce((somma, voti) => somma + voti.length, 0);

  const stats: Array<{ dot: string; label: string; num: number }> = [
    { dot: "bg-urgente", label: it.bacheca.statInEvidenza, num: inEvidenza },
    { dot: "bg-avviso", label: it.bacheca.statAvvisiNuovi, num: avvisiNuovi },
    { dot: "bg-scadenza", label: it.bacheca.statScadenzeAperte, num: deadlines.length },
    { dot: "bg-sondaggio", label: it.bacheca.statVotiSondaggi, num: votiSondaggi },
  ];

  const nome = (ctx.profile?.display_name ?? "").trim().split(/\s+/)[0] ?? "";
  const prossimaScadenza = deadlines[0];

  return (
    <div className="font-body">
      {eliminato === "1" && ctx.isRepresentative && (
        <div aria-live="polite" className="mb-4">
          <Banner tone="success">{it.bacheca.eliminato}</Banner>
        </div>
      )}

      {/* Pannello riepilogo: delimitato, non si confonde col feed */}
      <section className="rounded-[22px] border border-hairline bg-paper px-5 pb-1 pt-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[28px] font-bold">
              {it.bacheca.saluto.replace("{nome}", nome)}
            </h1>
            <p className="text-[16px] text-ink-soft">{it.bacheca.sottotitolo}</p>
          </div>
          {ctx.isRepresentative && (
            <Link
              href={`/c/${classCode}/nuovo`}
              className="flex min-h-12 items-center gap-1 whitespace-nowrap rounded-full bg-brand px-5 text-[16px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(91,79,232,0.3)]"
            >
              <Plus className="size-4" aria-hidden /> {it.bacheca.nuovoPost}
            </Link>
          )}
        </div>
        <div className="flex overflow-x-auto border-t border-hairline">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-24 flex-1 flex-col gap-1 border-l border-hairline px-4 py-3.5 first:border-l-0 first:pl-0.5"
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn("size-[7px] shrink-0 rounded-full", stat.dot)}
                />
                <span className="whitespace-nowrap text-[15px] text-ink-soft">
                  {stat.label}
                </span>
              </span>
              <span className="font-display text-[24px] font-bold">{stat.num}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Separatore: qui iniziano i contenuti */}
      <div className="mb-4 mt-[26px] flex items-center gap-2.5">
        <span className="whitespace-nowrap text-[15px] font-bold uppercase tracking-[0.07em] text-ink-faint">
          {it.bacheca.titolo}
        </span>
        <span aria-hidden className="h-px flex-1 bg-hairline" />
      </div>

      {/* Scadenza più imminente: box rosso in evidenza */}
      {prossimaScadenza && (
        <Link
          href={`/c/${classCode}/p/${prossimaScadenza.slug}`}
          className="mb-4 flex items-center gap-3 rounded-2xl bg-urgente-tint px-4 py-3"
        >
          <span
            aria-hidden
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-urgente"
          >
            <Pin className="size-4 text-white" />
          </span>
          <span className="min-w-0">
            <b className="block text-[18px] leading-snug text-urgente-ink">
              {prossimaScadenza.title}
            </b>
            <span className="text-[15px] text-urgente-ink/85">
              {it.bacheca.entroIl} {formatDateIt(prossimaScadenza.due_date!)}
            </span>
          </span>
        </Link>
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
              f.key === activeFilter.key
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
