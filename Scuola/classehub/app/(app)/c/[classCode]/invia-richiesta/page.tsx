import Link from "next/link";
import { Banner } from "@/components/shared/Banner";
import { Card } from "@/components/ui/Card";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { getPostById, listRequestsByAuthor } from "@/lib/db/queries";
import { formatShortDateIt } from "@/lib/format-date";
import { it } from "@/lib/i18n/it";
import { RichiestaForm } from "./RichiestaForm";

export const metadata = { title: `${it.richieste.titoloGenitore} — ${it.app.name}` };

/** Zona richieste del genitore: invia + storico delle proprie. */
export default async function InviaRichiestaPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ inviata?: string }>;
}) {
  const { classCode } = await params;
  const { inviata } = await searchParams;
  const ctx = await requireActiveMembership(classCode);

  const myRequests = listRequestsByAuthor(ctx.klass.id, ctx.user.id);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.richieste.titoloGenitore}</h1>
        <p className="mt-1 text-ink-soft">{it.richieste.spiegaGenitore}</p>
      </div>

      {inviata === "1" && (
        <div aria-live="polite">
          <Banner tone="success">{it.richieste.inviata}</Banner>
        </div>
      )}

      {ctx.membership.muted ? (
        <Banner tone="warning">{it.errori.silenziato}</Banner>
      ) : (
        <Card>
          <RichiestaForm classCode={classCode} />
        </Card>
      )}

      {myRequests.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-bold">{it.richieste.tueRichieste}</h2>
          <ul className="space-y-3">
            {myRequests.map((request) => (
              <li key={request.id}>
                <Card>
                  <p className="whitespace-pre-wrap">{request.body}</p>
                  <p className="mt-2 text-[15px] text-ink-soft">
                    {formatShortDateIt(request.created_at)} ·{" "}
                    {request.status === "open"
                      ? it.richieste.statoInviata
                      : request.status === "handled"
                        ? it.richieste.statoGestita
                        : it.richieste.statoArchiviata}
                  </p>
                  {request.status === "handled" && request.converted_to_post_id && (
                    <ConvertedLink
                      classCode={classCode}
                      postId={request.converted_to_post_id}
                    />
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ConvertedLink({
  classCode,
  postId,
}: {
  classCode: string;
  postId: string;
}) {
  const post = getPostById(postId);
  if (!post) return null;
  return (
    <Link
      href={`/c/${classCode}/p/${post.slug}`}
      className="mt-1 inline-block font-semibold text-accent underline underline-offset-4"
    >
      {it.richieste.vediPost}
    </Link>
  );
}
