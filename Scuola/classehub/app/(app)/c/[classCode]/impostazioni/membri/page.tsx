import { Volume2, VolumeX } from "lucide-react";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { listActiveMembers } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { rimuoviAction, toggleMuteAction } from "./actions";

export const metadata = { title: `${it.membri.titolo} — ${it.app.name}` };

/** Lista membri attivi: silenzia/riattiva e rimozione soft. */
export default async function MembriPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const ctx = await requireRepresentative(classCode);
  const members = listActiveMembers(ctx.klass.id);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.membri.titolo}</h1>
        <p className="mt-1 text-[16px] text-ink-soft">{it.membri.silenziaSpiega}</p>
      </div>

      <ul className="space-y-3">
        {members.map(({ membership, profile, email }) => (
          <li key={membership.id}>
            <Card className="space-y-3">
              <div>
                <p className="text-[20px] font-semibold">
                  {profile?.display_name ?? "—"}{" "}
                  {membership.role === "representative" && (
                    <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-[14px] font-bold text-accent-dark">
                      {it.membri.rappresentante}
                    </span>
                  )}
                  {membership.muted && (
                    <span className="rounded-full bg-warning-light px-2.5 py-0.5 text-[14px] font-bold text-warning">
                      {it.membri.silenziato}
                    </span>
                  )}
                </p>
                <p className="text-[16px] text-ink-soft">{email}</p>
              </div>

              {membership.role === "parent" && (
                <div className="flex flex-wrap gap-3">
                  <form action={toggleMuteAction}>
                    <input type="hidden" name="classCode" value={classCode} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <Button type="submit" variant="secondary">
                      {membership.muted ? (
                        <>
                          <Volume2 className="size-5" aria-hidden />
                          {it.membri.riattiva}
                        </>
                      ) : (
                        <>
                          <VolumeX className="size-5" aria-hidden />
                          {it.membri.silenzia}
                        </>
                      )}
                    </Button>
                  </form>

                  <ConfirmSubmit
                    action={rimuoviAction}
                    triggerLabel={it.membri.rimuovi}
                    title={it.membri.rimuoviTitolo}
                    description={it.membri.rimuoviTesto}
                    confirmLabel={it.membri.rimuoviSi}
                    cancelLabel={it.membri.rimuoviNo}
                    variant="danger"
                  >
                    <input type="hidden" name="classCode" value={classCode} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                  </ConfirmSubmit>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
