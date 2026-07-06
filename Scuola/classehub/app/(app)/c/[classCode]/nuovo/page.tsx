import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getRequestById } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import type { PostType } from "@/lib/db/types";
import { NuovoPostForm } from "./NuovoPostForm";

export const metadata = { title: `${it.nuovo.titolo} — ${it.app.name}` };

const TYPES: Array<{ type: PostType; emoji: string; spiega: string }> = [
  { type: "notice", emoji: "📢", spiega: it.nuovo.noticeSpiega },
  { type: "deadline", emoji: "⏰", spiega: it.nuovo.deadlineSpiega },
  { type: "poll", emoji: "🗳️", spiega: it.nuovo.pollSpiega },
  { type: "material", emoji: "📎", spiega: it.nuovo.materialSpiega },
];

/**
 * Crea post: prima scegli il tipo, poi compili il form.
 * Con ?richiesta=<id> il testo del genitore è già precompilato
 * (triage "trasforma con 2 click").
 */
export default async function NuovoPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ tipo?: string; richiesta?: string }>;
}) {
  const { classCode } = await params;
  const { tipo, richiesta } = await searchParams;
  const ctx = await requireRepresentative(classCode);

  const selected = TYPES.find((t) => t.type === tipo);

  // Precompila dal testo della richiesta, solo se appartiene alla classe.
  let defaultBody = "";
  let requestId = "";
  if (richiesta) {
    const request = getRequestById(richiesta);
    if (request && request.class_id === ctx.klass.id) {
      defaultBody = request.body;
      requestId = request.id;
    }
  }

  if (!selected) {
    const suffix = requestId ? `&richiesta=${requestId}` : "";
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-5 text-[28px] font-bold">{it.nuovo.titolo}</h1>
        <ul className="space-y-3">
          {TYPES.map((t) => (
            <li key={t.type}>
              <Link
                href={`/c/${classCode}/nuovo?tipo=${t.type}${suffix}`}
                className="block rounded-2xl border-2 border-line bg-paper p-5 hover:border-accent"
              >
                <p className="text-[22px] font-semibold">
                  <span aria-hidden>{t.emoji}</span> {it.postTypes[t.type]}
                </p>
                <p className="mt-1 text-[16px] text-ink-soft">{t.spiega}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-[28px] font-bold">
        <span aria-hidden>{selected.emoji}</span> {it.postTypes[selected.type]}
      </h1>
      <p className="mb-5 text-ink-soft">{selected.spiega}</p>
      <Card>
        <NuovoPostForm
          classCode={classCode}
          tipo={selected.type}
          defaultBody={defaultBody}
          requestId={requestId}
        />
      </Card>
    </div>
  );
}
