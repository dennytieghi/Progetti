import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@/components/shared/Banner";
import { Card } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { buttonClasses } from "@/components/ui/Button";
import { requireRepresentative } from "@/lib/auth/require-membership";
import {
  getCashMovementById,
  listActiveMembers,
  listCashMovementsWithShares,
  listCashSharesByMovement,
} from "@/lib/db/queries";
import { saldiPerMembroCents, saldoCassaCents } from "@/lib/cassa/saldi";
import { dividiPerSaldo } from "@/lib/cassa/debitori";
import { formatEuroCents } from "@/lib/euro";
import { it } from "@/lib/i18n/it";
import type { PaymentMethod } from "@/lib/db/types";
import { eliminaMovimentoAction } from "../../actions";

export const metadata = {
  title: `${it.cassa.confermaVersamentoTitolo} — ${it.app.name}`,
};

const METODO_FRASE: Record<PaymentMethod, string> = {
  contanti: it.cassa.metodoFraseContanti,
  bonifico: it.cassa.metodoFraseBonifico,
  satispay: it.cassa.metodoFraseSatispay,
  paypal: it.cassa.metodoFrasePaypal,
  altro: it.cassa.metodoFraseAltro,
};

export default async function ConfermaVersamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { classCode } = await params;
  const { m } = await searchParams;
  const ctx = await requireRepresentative(classCode);
  const cassaUrl = `/c/${classCode}/cassa`;

  const movement = m ? await getCashMovementById(m) : null;
  if (!movement || movement.class_id !== ctx.klass.id || movement.kind !== "deposit") {
    redirect(cassaUrl);
  }

  const [items, members, shares] = await Promise.all([
    listCashMovementsWithShares(ctx.klass.id),
    listActiveMembers(ctx.klass.id),
    listCashSharesByMovement(movement.id),
  ]);
  const membri = members.map((mm) => ({
    userId: mm.membership.user_id,
    name: mm.profile?.display_name ?? mm.email ?? "?",
  }));
  const saldi = saldiPerMembroCents(items);
  const { debitori, totaleDovutoCents } = dividiPerSaldo(membri, saldi);

  const versante = shares[0];
  const nomeVersante = versante
    ? (membri.find((x) => x.userId === versante.user_id)?.name ?? "—")
    : "—";
  const saldoVersante = versante ? (saldi.get(versante.user_id) ?? 0) : 0;
  const totaleOra = saldoCassaCents(items.map((i) => i.movement));
  const totalePrima = totaleOra - movement.total_cents;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div aria-live="polite">
        <Banner tone="success">
          {it.cassa.confermaVersamentoTitolo} —{" "}
          {it.cassa.confermaFrase
            .replace("{nome}", nomeVersante)
            .replace("{importo}", formatEuroCents(movement.total_cents))
            .replace("{metodo}", METODO_FRASE[movement.method])}
          {saldoVersante >= 0 ? ` ${it.cassa.confermaOraAPosto}` : ""}
        </Banner>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-[16px] font-semibold text-ink-soft">
            {it.cassa.saldoCassa}
          </p>
          <p className="text-[32px] font-bold">{formatEuroCents(totaleOra)}</p>
          <p className="text-[15px] text-ink-soft">
            {it.cassa.primaEra.replace("{importo}", formatEuroCents(totalePrima))}
          </p>
        </Card>
        <Card>
          <p className="text-[16px] font-semibold text-ink-soft">
            {it.cassa.mancaAncoraTitolo}
          </p>
          <p className="text-[20px] font-semibold">
            {debitori.length === 0
              ? it.cassa.nessunoManca
              : it.cassa.mancaAncoraDettaglio
                  .replace("{n}", String(debitori.length))
                  .replace("{importo}", formatEuroCents(totaleDovutoCents))}
          </p>
        </Card>
      </div>

      {debitori.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-bold">{it.cassa.chiDeveAncora}</h2>
          <ul className="space-y-2">
            {debitori.map((d) => (
              <li key={d.userId}>
                <Card className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-[18px] font-semibold">{d.name}</p>
                    <p className="text-[15px] font-semibold text-danger">
                      {it.cassa.deveImporto.replace(
                        "{importo}",
                        formatEuroCents(-d.cents)
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/c/${classCode}/cassa/versamento?genitore=${d.userId}`}
                    className={buttonClasses("secondary")}
                  >
                    {it.cassa.haPagato}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <Link href={cassaUrl} className={buttonClasses("primary", "lg")}>
          {it.cassa.tornaCassa}
        </Link>
        <ConfirmSubmit
          action={eliminaMovimentoAction}
          triggerLabel={it.cassa.annullaVersamento}
          title={it.cassa.annullaVersamentoTitolo}
          description={it.cassa.annullaVersamentoTesto}
          confirmLabel={it.cassa.annullaVersamentoSi}
          cancelLabel={it.cassa.annullaVersamentoNo}
          variant="secondary"
        >
          <input type="hidden" name="classCode" value={classCode} />
          <input type="hidden" name="movementId" value={movement.id} />
        </ConfirmSubmit>
      </div>
    </div>
  );
}
