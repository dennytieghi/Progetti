import { Check } from "lucide-react";
import { Banner } from "@/components/shared/Banner";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { listPendingMemberships } from "@/lib/db/queries";
import { formatShortDateIt } from "@/lib/format-date";
import { it } from "@/lib/i18n/it";
import { approvaAction, rifiutaAction } from "./actions";

export const metadata = { title: `${it.approvazioni.titolo} — ${it.app.name}` };

/** Coda "Richieste di iscrizione": approva o rifiuta ogni pending. */
export default async function ApprovazioniPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const ctx = await requireRepresentative(classCode);
  const pending = await listPendingMemberships(ctx.klass.id);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-bold">{it.approvazioni.titolo}</h1>

      <Banner tone="warning">{it.approvazioni.banner}</Banner>

      {pending.length === 0 ? (
        <EmptyState emoji="🎉" title={it.approvazioni.vuote} text="" />
      ) : (
        <ul className="space-y-4">
          {pending.map(({ membership, profile, email }) => (
            <li key={membership.id}>
              <Card className="space-y-4">
                <div>
                  <p className="text-[20px] font-semibold">
                    {profile?.display_name ?? "—"}
                  </p>
                  <p className="text-[16px] text-ink-soft">{email}</p>
                  <p className="mt-1 text-[15px] text-ink-soft">
                    {it.approvazioni.richiestaIl}{" "}
                    {formatShortDateIt(membership.joined_at)}
                  </p>
                  <p className="mt-2 rounded-xl bg-paper-soft px-3 py-2 text-[16px]">
                    <span className="font-semibold">{it.approvazioni.nota}:</span>{" "}
                    {membership.note_for_rep ?? it.approvazioni.nessunaNota}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <form action={approvaAction}>
                    <input type="hidden" name="classCode" value={classCode} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <Button type="submit">
                      <Check className="size-5" aria-hidden />
                      {it.approvazioni.approva}
                    </Button>
                  </form>

                  <ConfirmSubmit
                    action={rifiutaAction}
                    triggerLabel={it.approvazioni.rifiuta}
                    title={it.approvazioni.rifiutaTitolo}
                    description={it.approvazioni.banner}
                    confirmLabel={it.approvazioni.rifiutaConferma}
                    cancelLabel={it.common.indietro}
                    variant="secondary"
                  >
                    <input type="hidden" name="classCode" value={classCode} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <div className="text-left">
                      <Label htmlFor={`reason-${membership.id}`}>
                        {it.approvazioni.rifiutaMotivoLabel}
                      </Label>
                      <Textarea
                        id={`reason-${membership.id}`}
                        name="reason"
                        placeholder={it.approvazioni.rifiutaMotivoEsempio}
                        className="min-h-24"
                        maxLength={300}
                      />
                    </div>
                  </ConfirmSubmit>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
