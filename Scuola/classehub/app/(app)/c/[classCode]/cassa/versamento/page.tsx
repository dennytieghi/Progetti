import { requireRepresentative } from "@/lib/auth/require-membership";
import { listActiveMembers, listCashMovementsWithShares } from "@/lib/db/queries";
import { saldiPerMembroCents, saldoCassaCents } from "@/lib/cassa/saldi";
import { dividiPerSaldo } from "@/lib/cassa/debitori";
import { it } from "@/lib/i18n/it";
import { VersamentoNuovoForm } from "./VersamentoNuovoForm";

export const metadata = { title: `${it.cassa.ricevutoTitolo} — ${it.app.name}` };

export default async function VersamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ genitore?: string }>;
}) {
  const { classCode } = await params;
  const { genitore } = await searchParams;
  const ctx = await requireRepresentative(classCode);

  const [items, members] = await Promise.all([
    listCashMovementsWithShares(ctx.klass.id),
    listActiveMembers(ctx.klass.id),
  ]);
  const membri = members.map((m) => ({
    userId: m.membership.user_id,
    name: m.profile?.display_name ?? m.email ?? "?",
  }));
  const { debitori, aPosto } = dividiPerSaldo(membri, saldiPerMembroCents(items));
  const saldoCassa = saldoCassaCents(items.map((i) => i.movement));
  const preselezionato = membri.some((m) => m.userId === genitore) ? genitore! : null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-bold">{it.cassa.ricevutoTitolo}</h1>
      <VersamentoNuovoForm
        classCode={classCode}
        debitori={debitori}
        aPosto={aPosto}
        saldoCassaCents={saldoCassa}
        preselezionato={preselezionato}
      />
    </div>
  );
}
