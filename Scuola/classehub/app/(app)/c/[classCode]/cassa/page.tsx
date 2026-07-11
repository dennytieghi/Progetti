import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { Banner } from "@/components/shared/Banner";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import {
  getClassCashTotal,
  listActiveMembers,
  listCashMovementsWithShares,
  listMyDeclarations,
  listPendingDeclarations,
} from "@/lib/db/queries";
import {
  saldiPerMembroCents,
  saldoCassaCents,
  saldoPersonaleCents,
  testoSaldoPersonale,
  type MovimentoConQuote,
} from "@/lib/cassa/saldi";
import { formatEuroCents } from "@/lib/euro";
import { formatShortDateIt } from "@/lib/format-date";
import { formatCassaReminderForWhatsapp } from "@/lib/whatsapp/format-message";
import { getBaseUrl } from "@/lib/base-url";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import type { PaymentMethod } from "@/lib/db/types";
import { eliminaMovimentoAction } from "./actions";
import { VersamentoForm, type MemberOption } from "./VersamentoForm";
import { SpesaForm } from "./SpesaForm";
import { PromemoriaWhatsapp } from "./PromemoriaWhatsapp";
import { ComePagareBox } from "./ComePagareBox";
import { DichiaraVersamentoForm } from "./DichiaraVersamentoForm";
import { DaConfermareList } from "./DaConfermareList";

export const metadata = { title: `${it.cassa.titolo} — ${it.app.name}` };

/** Riusata anche dal Task 8-9 per mostrare il metodo nei movimenti. */
const METODO_LABEL: Record<PaymentMethod, string> = {
  contanti: it.cassa.metodoContanti,
  bonifico: it.cassa.metodoBonifico,
  satispay: it.cassa.metodoSatispay,
  paypal: it.cassa.metodoPaypal,
  altro: it.cassa.metodoAltro,
};

export default async function CassaPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{
    fatto?: string;
    modificata?: string;
    dichiarata?: string;
    confermata?: string;
    rifiutata?: string;
    errore?: string;
    tipo?: string;
    genitore?: string;
  }>;
}) {
  const { classCode } = await params;
  const { fatto, modificata, dichiarata, confermata, rifiutata, errore, tipo, genitore } =
    await searchParams;
  const ctx = await requireActiveMembership(classCode);

  const [items, members] = await Promise.all([
    listCashMovementsWithShares(ctx.klass.id),
    listActiveMembers(ctx.klass.id),
  ]);
  const mieDichiarazioni = !ctx.isRepresentative
    ? await listMyDeclarations(ctx.klass.id, ctx.user.id)
    : [];
  const daConfermare = ctx.isRepresentative
    ? await listPendingDeclarations(ctx.klass.id)
    : [];

  const memberOptions: MemberOption[] = members.map((m) => ({
    userId: m.membership.user_id,
    name: m.profile?.display_name ?? m.email ?? "?",
  }));
  const nomi = new Map(memberOptions.map((m) => [m.userId, m.name]));

  // ADR-017: il genitore non vede tutti i movimenti, quindi il totale
  // arriva dall'aggregato SQL; per il rappresentante resta il calcolo
  // dai movimenti (che per lui sono tutti, quindi sempre un numero).
  // Se la RPC del genitore non risponde, torna null: la riga in fondo
  // alla pagina semplicemente sparisce, niente errore mostrato.
  const totaleClasseRep = saldoCassaCents(items.map((i) => i.movement));
  const totaleClasseGenitore = ctx.isRepresentative
    ? null
    : await getClassCashTotal(ctx.klass.id);
  const miaQuota = saldoPersonaleCents(items, ctx.user.id);
  const contestoSaldo = testoSaldoPersonale(miaQuota);

  // Filtri: per tipo (tutti) e per genitore (solo rappresentante).
  const kindFiltro =
    tipo === "versamenti" ? "deposit" : tipo === "spese" ? "expense" : null;
  const genitoreFiltro =
    ctx.isRepresentative && genitore && nomi.has(genitore) ? genitore : null;
  let visibili = items;
  if (kindFiltro) visibili = visibili.filter((i) => i.movement.kind === kindFiltro);
  if (genitoreFiltro) {
    visibili = visibili.filter((i) =>
      i.shares.some((s) => s.user_id === genitoreFiltro)
    );
  }

  // I filtri attivi viaggiano nei link (chips ed export).
  function withFilters(overrides: { tipo?: string | null }): string {
    const q = new URLSearchParams();
    const t = overrides.tipo === undefined ? tipo : overrides.tipo;
    if (t === "versamenti" || t === "spese") q.set("tipo", t);
    if (genitoreFiltro) q.set("genitore", genitoreFiltro);
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  const FILTRI = [
    { key: "tutti", label: it.cassa.filtroTutti },
    { key: "versamenti", label: it.cassa.filtroVersamenti },
    { key: "spese", label: it.cassa.filtroSpese },
  ];
  const filtroAttivo = kindFiltro ? tipo : "tutti";

  const promemoriaWhatsapp = ctx.isRepresentative
    ? formatCassaReminderForWhatsapp({
        classCode: ctx.klass.class_code,
        className: ctx.klass.name,
        baseUrl: await getBaseUrl(),
        coords: {
          iban: ctx.klass.payment_iban,
          ibanHolder: ctx.klass.payment_iban_holder,
          paypal: ctx.klass.payment_paypal,
          satispay: ctx.klass.payment_satispay,
        },
      })
    : null;

  const haCoordinate = Boolean(
    ctx.klass.payment_iban || ctx.klass.payment_paypal || ctx.klass.payment_satispay
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.cassa.titolo}</h1>
        <p className="mt-1 text-ink-soft">
          {ctx.isRepresentative ? it.cassa.spiegaRep : it.cassa.spiegaGenitore}
        </p>
      </div>

      <div aria-live="polite" className="space-y-3">
        {fatto === "1" && <Banner tone="success">{it.cassa.registrato}</Banner>}
        {modificata === "1" && <Banner tone="success">{it.cassa.spesaAggiornata}</Banner>}
        {dichiarata === "1" && (
          <Banner tone="success">{it.cassa.dichiarazioneInviata}</Banner>
        )}
        {confermata === "1" && (
          <Banner tone="success">{it.cassa.dichiarazioneConfermata}</Banner>
        )}
        {rifiutata === "1" && (
          <Banner tone="success">{it.cassa.dichiarazioneRifiutata}</Banner>
        )}
      </div>

      {ctx.isRepresentative && daConfermare.length > 0 && (
        <DaConfermareList
          classCode={classCode}
          items={daConfermare.map((d) => ({
            declaration: d,
            parentName: nomi.get(d.user_id) ?? "—",
          }))}
        />
      )}

      {ctx.isRepresentative ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="text-[16px] font-semibold text-ink-soft">{it.cassa.tuaQuota}</p>
            <p
              className={cn(
                "text-[32px] font-bold",
                miaQuota < 0 ? "text-danger" : "text-ink"
              )}
            >
              {formatEuroCents(Math.abs(miaQuota))}
            </p>
            <p className="text-[15px] text-ink-soft">
              {miaQuota > 0
                ? it.cassa.quotaPositiva
                : miaQuota < 0
                  ? it.cassa.quotaNegativa
                  : it.cassa.quotaZero}
            </p>
          </Card>
          <Card>
            <p className="text-[16px] font-semibold text-ink-soft">{it.cassa.saldoCassa}</p>
            <p className="text-[32px] font-bold">{formatEuroCents(totaleClasseRep)}</p>
          </Card>
        </div>
      ) : (
        <Card className="text-center">
          <p className="text-[16px] font-semibold text-ink-soft">
            {it.cassa.quantoRestaTitolo}
          </p>
          <p
            className={cn(
              "text-[44px] font-bold leading-tight",
              contestoSaldo.negativo ? "text-danger" : "text-ink"
            )}
          >
            {formatEuroCents(Math.abs(miaQuota))}
          </p>
          <p
            className={cn(
              "text-[15px]",
              contestoSaldo.negativo ? "font-semibold text-danger" : "text-ink-soft"
            )}
          >
            {contestoSaldo.testo}
          </p>
        </Card>
      )}

      {haCoordinate && !ctx.isRepresentative && <ComePagareBox klass={ctx.klass} />}
      {ctx.isRepresentative && !haCoordinate && (
        <Card className="space-y-3">
          <p className="text-[15px] text-ink-soft">{it.cassa.comePagareMancaRep}</p>
          <Link
            href={`/c/${classCode}/impostazioni`}
            className={buttonClasses("secondary")}
          >
            {it.cassa.comePagareImposta}
          </Link>
        </Card>
      )}

      {!ctx.isRepresentative && (
        <Card>
          <h2 className="text-[19px] font-bold">{it.cassa.dichiaraTitolo}</h2>
          <p className="mb-4 mt-1 text-[15px] text-ink-soft">{it.cassa.dichiaraSpiega}</p>
          <DichiaraVersamentoForm classCode={classCode} />
        </Card>
      )}

      {mieDichiarazioni.length > 0 && (
        <section>
          <h2 className="mb-3 text-[22px] font-bold">{it.cassa.tueDichiarazioni}</h2>
          <ul className="space-y-3">
            {mieDichiarazioni.map((d) => (
              <li key={d.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-semibold">
                      {formatEuroCents(d.amount_cents)} · {METODO_LABEL[d.method]}
                    </p>
                    <p className="text-[15px] text-ink-soft">
                      {formatShortDateIt(d.created_at)}
                      {d.note ? ` · ${d.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[15px] font-semibold",
                      d.status === "pending"
                        ? "bg-warning-light text-warning"
                        : "bg-danger-light text-danger"
                    )}
                  >
                    {d.status === "pending"
                      ? it.cassa.statoInAttesa
                      : it.cassa.statoRifiutata}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Rappresentante: registra movimenti */}
      {ctx.isRepresentative && (
        <section className="space-y-4">
          <h2 className="text-[22px] font-bold">{it.cassa.registraTitolo}</h2>
          <Card>
            <h3 className="text-[19px] font-bold">{it.cassa.registraVersamento}</h3>
            <p className="mb-4 mt-1 text-[15px] text-ink-soft">
              {it.cassa.registraVersamentoSpiega}
            </p>
            <VersamentoForm classCode={classCode} members={memberOptions} />
          </Card>
          <Card>
            <h3 className="text-[19px] font-bold">{it.cassa.registraSpesa}</h3>
            <p className="mb-4 mt-1 text-[15px] text-ink-soft">
              {it.cassa.registraSpesaSpiega}
            </p>
            <SpesaForm classCode={classCode} members={memberOptions} />
          </Card>
        </section>
      )}

      {/* Rappresentante: promemoria versamenti per il gruppo WhatsApp */}
      {promemoriaWhatsapp && (
        <Card className="space-y-3">
          <h2 className="text-[19px] font-bold">{it.cassa.promemoriaTitolo}</h2>
          <p className="text-[15px] text-ink-soft">{it.cassa.promemoriaSpiega}</p>
          <PromemoriaWhatsapp defaultText={promemoriaWhatsapp} />
        </Card>
      )}

      {/* Rappresentante: quote dei genitori */}
      {ctx.isRepresentative && items.length > 0 && (
        <section>
          <h2 className="text-[22px] font-bold">{it.cassa.saldiTitolo}</h2>
          <p className="mb-3 mt-1 text-[15px] text-ink-soft">{it.cassa.saldiSpiega}</p>
          <Card>
            <ul className="divide-y divide-line">
              {[...saldiPerMembroCents(items).entries()]
                .map(([userId, cents]) => ({
                  userId,
                  cents,
                  name: nomi.get(userId) ?? "—",
                }))
                .sort((a, b) => a.name.localeCompare(b.name, "it"))
                .map(({ userId, cents, name }) => (
                  <li
                    key={userId}
                    className="flex items-center justify-between py-2 text-[17px]"
                  >
                    <span>{name}</span>
                    <span
                      className={cn(
                        "font-semibold",
                        cents < 0 ? "text-danger" : "text-ink"
                      )}
                    >
                      {formatEuroCents(cents)}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Scarica i movimenti (CSV che Excel e Google Fogli aprono) */}
      {items.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs text-[15px] text-ink-soft">
            {ctx.isRepresentative
              ? it.cassa.esportaSpiegaRep
              : it.cassa.esportaSpiegaGenitore}
          </p>
          <a
            href={`/c/${classCode}/cassa/esporta${withFilters({})}`}
            download
            className={buttonClasses("secondary")}
          >
            <Download className="size-5" aria-hidden /> {it.cassa.esporta}
          </a>
        </Card>
      )}

      {/* Movimenti */}
      <section>
        <h2 className="mb-3 text-[22px] font-bold">{it.cassa.movimentiCassa}</h2>

        {items.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {FILTRI.map((f) => (
                <Link
                  key={f.key}
                  href={`/c/${classCode}/cassa${withFilters({
                    tipo: f.key === "tutti" ? null : f.key,
                  })}`}
                  className={cn(
                    "min-h-12 rounded-full border-2 px-4 py-2.5 text-[16px] font-semibold",
                    f.key === filtroAttivo
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-paper text-ink-soft hover:border-accent"
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>

            {ctx.isRepresentative && (
              <form
                action={`/c/${classCode}/cassa`}
                method="get"
                className="flex flex-wrap items-end gap-2"
              >
                {kindFiltro && <input type="hidden" name="tipo" value={tipo} />}
                <div className="min-w-52">
                  <label
                    htmlFor="filtro-genitore"
                    className="mb-1 block text-[15px] font-semibold text-ink-soft"
                  >
                    {it.cassa.filtroGenitoreLabel}
                  </label>
                  <select
                    id="filtro-genitore"
                    name="genitore"
                    defaultValue={genitoreFiltro ?? ""}
                    className="min-h-12 w-full rounded-xl border-2 border-line bg-paper px-4 text-[17px] focus:border-accent focus:outline-none"
                  >
                    <option value="">{it.cassa.filtroGenitoreTutti}</option>
                    {memberOptions.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="secondary">
                  {it.cassa.filtra}
                </Button>
              </form>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <Card>
            <p className="text-ink-soft">
              {ctx.isRepresentative ? it.cassa.nessunMovimento : it.cassa.nessunMovimentoTuo}
            </p>
          </Card>
        ) : visibili.length === 0 ? (
          <Card>
            <p className="text-ink-soft">{it.cassa.nessunRisultatoFiltro}</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {visibili.map((item) => (
              <li key={item.movement.id}>
                <MovementCard
                  item={item}
                  classCode={classCode}
                  userId={ctx.user.id}
                  isRepresentative={ctx.isRepresentative}
                  nomi={nomi}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!ctx.isRepresentative && totaleClasseGenitore !== null && (
        <p className="text-center text-[14px] text-ink-soft">
          {it.cassa.totaleClasse.replace(
            "{importo}",
            formatEuroCents(totaleClasseGenitore)
          )}
        </p>
      )}
    </div>
  );
}

function MovementCard({
  item,
  classCode,
  userId,
  isRepresentative,
  nomi,
}: {
  item: MovimentoConQuote;
  classCode: string;
  userId: string;
  isRepresentative: boolean;
  nomi: Map<string, string>;
}) {
  const { movement, shares } = item;
  const isDeposit = movement.kind === "deposit";
  const myShare = shares.find((s) => s.user_id === userId);

  // Il rappresentante vede l'intestatario del versamento; per la spesa
  // basta il conteggio (i nomi sono nella sezione quote).
  const firstShare = shares[0];
  const intestatario =
    isDeposit && shares.length === 1 && firstShare
      ? nomi.get(firstShare.user_id)
      : null;
  const perHead = !isDeposit && firstShare ? firstShare.amount_cents : null;
  // Il genitore riceve solo la propria quota (RLS): i partecipanti si
  // contano dal totale, non dalle quote visibili.
  const partecipanti = perHead ? Math.round(movement.total_cents / perHead) : 0;

  return (
    <Card className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-soft">
          {isDeposit ? it.cassa.versamento : it.cassa.spesa}
          {isDeposit ? ` · ${METODO_LABEL[movement.method]}` : ""}
        </p>
        <p className="text-[18px] font-semibold">{movement.title}</p>
        <p className="text-[15px] text-ink-soft">
          {formatShortDateIt(movement.created_at)}
          {intestatario ? ` · ${intestatario}` : ""}
          {perHead !== null
            ? isRepresentative
              ? ` · ${partecipanti} ${partecipanti === 1 ? it.cassa.partecipante : it.cassa.partecipanti} × ${formatEuroCents(perHead)} ${it.cassa.aTesta}`
              : ` · ${it.cassa.spesaDiClasse} · ${partecipanti} ${partecipanti === 1 ? it.cassa.partecipante : it.cassa.partecipanti}`
            : ""}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <p
          className={cn(
            "text-[20px] font-bold",
            isDeposit ? "text-success" : "text-danger"
          )}
        >
          {isDeposit ? "+" : "−"}
          {formatEuroCents(
            isRepresentative ? movement.total_cents : (myShare?.amount_cents ?? 0)
          )}
        </p>
        {isRepresentative && (
          <div className="flex gap-2">
            {!isDeposit && (
              <Link
                href={`/c/${classCode}/cassa/spesa/${movement.id}`}
                className={buttonClasses("secondary")}
              >
                <Pencil className="size-5" aria-hidden /> {it.cassa.modificaSpesa}
              </Link>
            )}
            <ConfirmSubmit
              action={eliminaMovimentoAction}
              triggerLabel={it.cassa.elimina}
              title={it.cassa.eliminaTitolo}
              description={it.cassa.eliminaTesto}
              confirmLabel={it.cassa.eliminaSi}
              cancelLabel={it.cassa.eliminaNo}
              variant="secondary"
            >
              <input type="hidden" name="classCode" value={classCode} />
              <input type="hidden" name="movementId" value={movement.id} />
            </ConfirmSubmit>
          </div>
        )}
      </div>
    </Card>
  );
}
