import Link from "next/link";
import { Download } from "lucide-react";
import { Banner } from "@/components/shared/Banner";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import {
  getClassCashTotal,
  listActiveMembers,
  listCashMovementsWithShares,
  listMyDeclarations,
  listPendingDeclarations,
} from "@/lib/db/queries";
import { dividiPerSaldo } from "@/lib/cassa/debitori";
import {
  saldiPerMembroCents,
  saldoCassaCents,
  saldoPersonaleCents,
  testoSaldoPersonale,
} from "@/lib/cassa/saldi";
import { formatEuroCents } from "@/lib/euro";
import { formatShortDateIt } from "@/lib/format-date";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import { MovementCard, METODO_LABEL, type MemberOption } from "./MovementCard";
import { ComePagareBox } from "./ComePagareBox";
import { DichiaraVersamentoForm } from "./DichiaraVersamentoForm";
import { DaConfermareList } from "./DaConfermareList";

export const metadata = { title: `${it.cassa.titolo} — ${it.app.name}` };

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
  }>;
}) {
  const { classCode } = await params;
  const { fatto, modificata, dichiarata, confermata, rifiutata, errore, tipo } =
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

  const { debitori, aPosto, totaleDovutoCents } = ctx.isRepresentative
    ? dividiPerSaldo(memberOptions, saldiPerMembroCents(items))
    : { debitori: [], aPosto: [], totaleDovutoCents: 0 };

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

  // Filtri: per tipo (solo per la lista del genitore, che resta com'era).
  const kindFiltro =
    tipo === "versamenti" ? "deposit" : tipo === "spese" ? "expense" : null;
  let visibili = items;
  if (kindFiltro) visibili = visibili.filter((i) => i.movement.kind === kindFiltro);

  // Il filtro attivo viaggia nei link (chips ed export).
  function withFilters(overrides: { tipo?: string | null }): string {
    const q = new URLSearchParams();
    const t = overrides.tipo === undefined ? tipo : overrides.tipo;
    if (t === "versamenti" || t === "spese") q.set("tipo", t);
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  const FILTRI = [
    { key: "tutti", label: it.cassa.filtroTutti },
    { key: "versamenti", label: it.cassa.filtroVersamenti },
    { key: "spese", label: it.cassa.filtroSpese },
  ];
  const filtroAttivo = kindFiltro ? tipo : "tutti";

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
        <Card className="text-center">
          <p className="text-[16px] font-semibold text-ink-soft">{it.cassa.saldoCassa}</p>
          <p className="text-[44px] font-bold leading-tight">
            {formatEuroCents(totaleClasseRep)}
          </p>
          {debitori.length > 0 && (
            <p className="text-[15px] text-ink-soft">
              {(debitori.length === 1
                ? it.cassa.deveVersareUno
                : it.cassa.devonoVersare.replace("{n}", String(debitori.length))
              ).replace("{importo}", formatEuroCents(totaleDovutoCents))}
            </p>
          )}
        </Card>
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

      {/* Rappresentante: due azioni grandi */}
      {ctx.isRepresentative && (
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/c/${classCode}/cassa/versamento`}
            className={buttonClasses("primary", "lg", "min-h-16")}
          >
            {it.cassa.bottoneRicevuto}
          </Link>
          <Link
            href={`/c/${classCode}/cassa/spesa`}
            className={buttonClasses("secondary", "lg", "min-h-16")}
          >
            {it.cassa.bottoneSpeso}
          </Link>
        </div>
      )}

      {/* Rappresentante: chi deve versare */}
      {ctx.isRepresentative && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[22px] font-bold">{it.cassa.chiDeveVersareTitolo}</h2>
            <Link
              href={`/c/${classCode}/cassa/promemoria`}
              className={buttonClasses("secondary")}
            >
              {it.cassa.ricordaATutti}
            </Link>
          </div>
          {debitori.length === 0 ? (
            <Card>
              <p className="text-ink-soft">{it.cassa.tuttiAPosto}</p>
            </Card>
          ) : (
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
          )}
        </section>
      )}

      {/* Rappresentante: accordion chi è a posto */}
      {ctx.isRepresentative && aPosto.length > 0 && (
        <details className="rounded-2xl border border-line bg-paper px-5 py-4">
          <summary className="min-h-12 cursor-pointer text-[17px] font-semibold">
            {aPosto.length === 1
              ? it.cassa.genitoreAPostoUno
              : it.cassa.genitoriAPosto.replace("{n}", String(aPosto.length))}
          </summary>
          <ul className="mt-3 divide-y divide-line">
            {aPosto.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between py-2 text-[17px]"
              >
                <span>{m.name}</span>
                <span className="text-ink-soft">{formatEuroCents(m.cents)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Rappresentante: le ultime entrate e uscite */}
      {ctx.isRepresentative && (
        <section>
          <h2 className="mb-3 text-[22px] font-bold">{it.cassa.ultimeEntrateUscite}</h2>
          {items.length === 0 ? (
            <Card>
              <p className="text-ink-soft">{it.cassa.nessunMovimento}</p>
            </Card>
          ) : (
            <>
              <ul className="space-y-3">
                {items.slice(0, 5).map((item) => (
                  <li key={item.movement.id}>
                    <MovementCard
                      item={item}
                      classCode={classCode}
                      userId={ctx.user.id}
                      isRepresentative={true}
                      nomi={nomi}
                      showActions={false}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/c/${classCode}/cassa/movimenti`}
                  className={buttonClasses("secondary")}
                >
                  {it.cassa.vediTutti}
                </Link>
                <a
                  href={`/c/${classCode}/cassa/esporta`}
                  download
                  className={buttonClasses("secondary")}
                >
                  <Download className="size-5" aria-hidden /> {it.cassa.excel}
                </a>
              </div>
            </>
          )}
        </section>
      )}

      {/* Genitore: scarica i movimenti (CSV che Excel e Google Fogli aprono) */}
      {!ctx.isRepresentative && items.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs text-[15px] text-ink-soft">
            {it.cassa.esportaSpiegaGenitore}
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

      {/* Genitore: i tuoi movimenti */}
      {!ctx.isRepresentative && (
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
            </div>
          )}

          {items.length === 0 ? (
            <Card>
              <p className="text-ink-soft">{it.cassa.nessunMovimentoTuo}</p>
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
                    isRepresentative={false}
                    nomi={nomi}
                    showActions={true}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
