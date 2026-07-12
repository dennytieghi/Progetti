import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Pencil, Pin, PinOff } from "lucide-react";
import { PollResults } from "@/components/polls/PollResults";
import { PollVoteForm } from "@/components/polls/PollVoteForm";
import { Banner } from "@/components/shared/Banner";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { CopyButton } from "@/components/shared/CopyButton";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import {
  getPoll,
  getPostBySlug,
  getProfile,
  hasVoted,
  isPollClosed,
  listActiveMembers,
  listMyReadPostIds,
  listPollOptions,
  listPollVotes,
  listPostReads,
} from "@/lib/db/queries";
import { getBaseUrl } from "@/lib/base-url";
import { formatDateIt, formatShortDateIt } from "@/lib/format-date";
import { formatPostForWhatsapp } from "@/lib/whatsapp/format-message";
import { it } from "@/lib/i18n/it";
import {
  chiudiSondaggioAction,
  eliminaPostAction,
  segnaVistoAction,
  toggleArchivioAction,
  togglePinAction,
} from "./actions";

const TYPE_EMOJI = { notice: "📢", deadline: "⏰", poll: "🗳️", material: "📎" } as const;

/** Dettaglio post: la pagina che i genitori aprono dal link WhatsApp. */
export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string; postSlug: string }>;
  searchParams: Promise<{ fatto?: string; modificato?: string }>;
}) {
  const { classCode, postSlug } = await params;
  const { fatto, modificato } = await searchParams;
  const ctx = await requireActiveMembership(classCode);

  const post = await getPostBySlug(ctx.klass.id, postSlug);
  if (!post) notFound();

  const author = await getProfile(post.author_id);

  // "L'ho visto": mai sui sondaggi (lì conta il voto, anonimo).
  const conVisto = post.type !== "poll";
  const ioHoVisto = conVisto
    ? (await listMyReadPostIds(ctx.user.id, [post.id])).has(post.id)
    : false;
  // Il rappresentante vede il conteggio e chi manca (solo genitori).
  const [visti, membri] =
    conVisto && ctx.isRepresentative
      ? await Promise.all([listPostReads(post.id), listActiveMembers(ctx.klass.id)])
      : [[], []];
  const vistiSet = new Set(visti.map((v) => v.user_id));
  const genitori = membri.filter((m) => m.membership.role === "parent");
  const nVisto = genitori.filter((g) => vistiSet.has(g.membership.user_id)).length;

  const poll = post.type === "poll" ? await getPoll(post.id) : null;
  const pollOptions = poll ? await listPollOptions(post.id) : [];
  const pollVotes = poll ? await listPollVotes(post.id) : [];
  const pollClosed = poll ? isPollClosed(poll) : false;
  const userHasVoted = poll ? await hasVoted(post.id) : false;

  const whatsappText = formatPostForWhatsapp({
    post,
    classCode: ctx.klass.class_code,
    baseUrl: await getBaseUrl(),
    pollClosesAt: poll?.closes_at,
  });

  const hiddenFields = (
    <>
      <input type="hidden" name="classCode" value={classCode} />
      <input type="hidden" name="slug" value={post.slug} />
    </>
  );

  return (
    <div className="space-y-6">
      {fatto === "1" && ctx.isRepresentative && (
        <Card className="space-y-3 border-success/40 bg-success-light">
          <h2 className="text-[22px] font-bold text-success">{it.fatto.titolo}</h2>
          <p className="text-[16px]">{it.fatto.testo}</p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 text-[16px]">
            {whatsappText}
          </pre>
          <CopyButton text={whatsappText} />
        </Card>
      )}

      {modificato === "1" && ctx.isRepresentative && (
        <div aria-live="polite">
          <Banner tone="success">{it.dettaglio.aggiornato}</Banner>
        </div>
      )}

      <article>
        {post.archived && (
          <div className="mb-3">
            <Banner tone="warning">{it.bacheca.archiviato}</Banner>
          </div>
        )}
        <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-soft">
          <span aria-hidden>{TYPE_EMOJI[post.type]}</span> {it.postTypes[post.type]}
        </p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight">{post.title}</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          {it.dettaglio.pubblicatoDa} {author?.display_name ?? "—"} {it.dettaglio.il}{" "}
          {formatShortDateIt(post.created_at)}
          {post.edited_at &&
            ` · ${it.dettaglio.modificatoIl} ${formatShortDateIt(post.edited_at)}`}
        </p>

        {post.type === "deadline" && post.due_date && (
          <div className="mt-4">
            <Banner tone="warning">
              <span className="font-semibold">
                📅 {it.bacheca.entroIl} {formatDateIt(post.due_date)}
              </span>
            </Banner>
          </div>
        )}

        {post.body && (
          <p className="mt-4 whitespace-pre-wrap text-[18px] leading-relaxed">
            {post.body}
          </p>
        )}

        {post.photo_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/c/${classCode}/foto/${post.photo_path}`}
            alt={post.title}
            className="mt-4 max-w-full rounded-2xl border border-line"
          />
        )}

        {conVisto && !ctx.isRepresentative && (
          <form action={segnaVistoAction} className="mt-5">
            <input type="hidden" name="classCode" value={classCode} />
            <input type="hidden" name="slug" value={post.slug} />
            <input type="hidden" name="visto" value={ioHoVisto ? "0" : "1"} />
            <Button type="submit" variant={ioHoVisto ? "secondary" : "primary"}>
              <Check className="size-5" aria-hidden />
              {ioHoVisto ? it.dettaglio.vistoTogli : it.dettaglio.vistoSegna}
            </Button>
          </form>
        )}
      </article>

      {conVisto && ctx.isRepresentative && (
        <Card className="space-y-1">
          <h2 className="font-display text-[20px] font-bold">
            {it.dettaglio.vistiTitolo}
          </h2>
          <p className="font-display text-[36px] font-bold leading-tight">
            {nVisto}
            <span className="text-[22px] font-semibold text-ink-soft">
              {" "}
              {it.dettaglio.vistiSu} {genitori.length}
            </span>
          </p>
          <p className="text-[15px] text-ink-soft">{it.dettaglio.vistiSpiega}</p>
        </Card>
      )}

      {poll && (
        <Card className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[22px] font-bold">
              {pollClosed ? it.sondaggio.risultati : it.postTypes.poll}
            </h2>
            <span className="shrink-0 text-[15px] text-ink-soft">
              {pollClosed
                ? it.bacheca.chiuso
                : `${it.bacheca.chiudeIl} ${formatDateIt(poll.closes_at)}`}
            </span>
          </div>

          {pollClosed ? (
            <>
              <p className="text-[16px] text-ink-soft">{it.sondaggio.chiusoTesto}</p>
              <PollResults options={pollOptions} votes={pollVotes} />
            </>
          ) : userHasVoted ? (
            <>
              <div aria-live="polite">
                <Banner tone="success">{it.sondaggio.haiVotato}</Banner>
              </div>
              <PollResults options={pollOptions} votes={pollVotes} />
            </>
          ) : ctx.membership.muted ? (
            <Banner tone="warning">{it.errori.silenziato}</Banner>
          ) : (
            <PollVoteForm
              classCode={classCode}
              slug={post.slug}
              options={pollOptions.map((o) => ({ id: o.id, label: o.label }))}
            />
          )}

          {ctx.isRepresentative && !pollClosed && (
            <ConfirmSubmit
              action={chiudiSondaggioAction}
              triggerLabel={it.sondaggio.chiudiOra}
              title={it.sondaggio.chiudiConfermaTitolo}
              description={it.sondaggio.chiudiConfermaTesto}
              confirmLabel={it.sondaggio.chiudiSi}
              cancelLabel={it.sondaggio.chiudiNo}
              variant="secondary"
            >
              {hiddenFields}
            </ConfirmSubmit>
          )}
        </Card>
      )}

      {ctx.isRepresentative && (
        <Card className="space-y-4">
          {fatto !== "1" && (
            <>
              <h2 className="text-[20px] font-bold">{it.common.copiaWhatsapp}</h2>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-paper-soft p-4 text-[16px]">
                {whatsappText}
              </pre>
              <CopyButton text={whatsappText} />
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/c/${classCode}/p/${post.slug}/modifica`}
              className={buttonClasses("secondary")}
            >
              <Pencil className="size-5" aria-hidden /> {it.dettaglio.modifica}
            </Link>

            <form action={togglePinAction}>
              {hiddenFields}
              <Button type="submit" variant="secondary">
                {post.pinned ? (
                  <>
                    <PinOff className="size-5" aria-hidden /> {it.dettaglio.togliFissa}
                  </>
                ) : (
                  <>
                    <Pin className="size-5" aria-hidden /> {it.dettaglio.fissa}
                  </>
                )}
              </Button>
            </form>

            {post.archived ? (
              <form action={toggleArchivioAction}>
                {hiddenFields}
                <Button type="submit" variant="secondary">
                  {it.dettaglio.ripristina}
                </Button>
              </form>
            ) : (
              <ConfirmSubmit
                action={toggleArchivioAction}
                triggerLabel={it.dettaglio.archivia}
                title={it.dettaglio.archiviaConfermaTitolo}
                description={it.dettaglio.archiviaConfermaTesto}
                confirmLabel={it.dettaglio.archiviaSi}
                cancelLabel={it.dettaglio.archiviaNo}
                variant="secondary"
              >
                {hiddenFields}
              </ConfirmSubmit>
            )}

            <ConfirmSubmit
              action={eliminaPostAction}
              triggerLabel={it.dettaglio.eliminaPost}
              title={it.dettaglio.eliminaPostTitolo}
              description={it.dettaglio.eliminaPostTesto}
              confirmLabel={it.dettaglio.eliminaPostSi}
              cancelLabel={it.dettaglio.eliminaPostNo}
              variant="danger"
            >
              {hiddenFields}
            </ConfirmSubmit>
          </div>
        </Card>
      )}
    </div>
  );
}
