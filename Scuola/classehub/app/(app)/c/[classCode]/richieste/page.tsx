import Link from "next/link";
import { Archive, Megaphone, Vote } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getProfile, listRequests } from "@/lib/db/queries";
import { formatShortDateIt } from "@/lib/format-date";
import { it } from "@/lib/i18n/it";
import { archiviaRichiestaAction } from "./actions";

export const metadata = { title: `${it.richieste.titoloRep} — ${it.app.name}` };

/**
 * Coda richieste per il rappresentante: trasforma in avviso/sondaggio
 * con 2 click (il testo arriva precompilato) oppure archivia.
 */
export default async function RichiesteRepPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const ctx = await requireRepresentative(classCode);

  const all = await listRequests(ctx.klass.id);
  const open = all.filter((r) => r.status === "open");
  const done = all.filter((r) => r.status !== "open");

  // Nomi degli autori, letti una volta sola prima di disegnare la lista.
  const authorNames = new Map<string, string>();
  for (const authorId of new Set(all.map((r) => r.author_id))) {
    const profile = await getProfile(authorId);
    if (profile) authorNames.set(authorId, profile.display_name);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-[28px] font-bold">{it.richieste.titoloRep}</h1>

      {open.length === 0 ? (
        <EmptyState emoji="✅" title={it.richieste.vuoteRep} text="" />
      ) : (
        <ul className="space-y-4">
          {open.map((request) => {
            const author = { display_name: authorNames.get(request.author_id) };
            return (
              <li key={request.id}>
                <Card className="space-y-4">
                  <div>
                    <p className="text-[15px] font-semibold text-ink-soft">
                      {it.richieste.da} {author?.display_name ?? "—"} ·{" "}
                      {formatShortDateIt(request.created_at)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[18px]">
                      {request.body}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/c/${classCode}/nuovo?tipo=notice&richiesta=${request.id}`}
                      className={buttonClasses("primary", "md")}
                    >
                      <Megaphone className="size-5" aria-hidden />
                      {it.richieste.trasformaAvviso}
                    </Link>
                    <Link
                      href={`/c/${classCode}/nuovo?tipo=poll&richiesta=${request.id}`}
                      className={buttonClasses("secondary", "md")}
                    >
                      <Vote className="size-5" aria-hidden />
                      {it.richieste.trasformaSondaggio}
                    </Link>
                    <form action={archiviaRichiestaAction}>
                      <input type="hidden" name="classCode" value={classCode} />
                      <input type="hidden" name="requestId" value={request.id} />
                      <Button type="submit" variant="ghost">
                        <Archive className="size-5" aria-hidden />
                        {it.richieste.archiviaRichiesta}
                      </Button>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-bold">{it.richieste.richiesteGestite}</h2>
          <ul className="space-y-3">
            {done.map((request) => {
              const author = { display_name: authorNames.get(request.author_id) };
              return (
                <li key={request.id}>
                  <Card className="bg-paper-soft">
                    <p className="text-[15px] font-semibold text-ink-soft">
                      {it.richieste.da} {author?.display_name ?? "—"} ·{" "}
                      {formatShortDateIt(request.created_at)} ·{" "}
                      {request.status === "handled"
                        ? it.richieste.statoGestita
                        : it.richieste.statoArchiviata}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[16px] text-ink-soft">
                      {request.body}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
