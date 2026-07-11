import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { requireRepresentative } from "@/lib/auth/require-membership";
import {
  getCashMovementById,
  listActiveMembers,
  listCashSharesByMovement,
} from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { SpesaForm } from "../../SpesaForm";
import type { MemberOption } from "../../VersamentoForm";

export const metadata = { title: `${it.cassa.modificaSpesaTitolo} — ${it.app.name}` };

/** Modifica di una spesa manuale: solo il rappresentante ci arriva. */
export default async function ModificaSpesaPage({
  params,
}: {
  params: Promise<{ classCode: string; movementId: string }>;
}) {
  const { classCode, movementId } = await params;
  const ctx = await requireRepresentative(classCode);

  const movement = await getCashMovementById(movementId);
  if (
    !movement ||
    movement.class_id !== ctx.klass.id ||
    movement.kind !== "expense" ||
    movement.source !== "manual"
  ) {
    notFound();
  }

  const [shares, members] = await Promise.all([
    listCashSharesByMovement(movement.id),
    listActiveMembers(ctx.klass.id),
  ]);
  const memberOptions: MemberOption[] = members.map((m) => ({
    userId: m.membership.user_id,
    name: m.profile?.display_name ?? m.email ?? "?",
  }));
  const firstShare = shares[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.cassa.modificaSpesaTitolo}</h1>
        <p className="mt-1 text-ink-soft">{it.cassa.modificaSpesaSpiega}</p>
      </div>

      <Card>
        <SpesaForm
          classCode={classCode}
          members={memberOptions}
          spesa={{
            movementId: movement.id,
            title: movement.title,
            perHeadCents: firstShare?.amount_cents ?? movement.total_cents,
            participantIds: shares.map((s) => s.user_id),
          }}
        />
      </Card>
    </div>
  );
}
