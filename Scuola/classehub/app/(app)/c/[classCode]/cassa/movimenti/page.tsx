import Link from "next/link";
import { Download } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { listActiveMembers, listCashMovementsWithShares } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import { MovementCard, type MemberOption } from "../MovementCard";

export const metadata = { title: `${it.cassa.entrateUsciteTitolo} — ${it.app.name}` };

export default async function MovimentiPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ tipo?: string; genitore?: string }>;
}) {
  const { classCode } = await params;
  const { tipo, genitore } = await searchParams;
  const ctx = await requireRepresentative(classCode);

  const [items, members] = await Promise.all([
    listCashMovementsWithShares(ctx.klass.id),
    listActiveMembers(ctx.klass.id),
  ]);

  const memberOptions: MemberOption[] = members.map((m) => ({
    userId: m.membership.user_id,
    name: m.profile?.display_name ?? m.email ?? "?",
  }));
  const nomi = new Map(memberOptions.map((m) => [m.userId, m.name]));

  // Filtri: per tipo (tutti) e per genitore.
  const kindFiltro =
    tipo === "versamenti" ? "deposit" : tipo === "spese" ? "expense" : null;
  const genitoreFiltro = genitore && nomi.has(genitore) ? genitore : null;
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.cassa.entrateUsciteTitolo}</h1>
      </div>

      {/* Scarica i movimenti (CSV che Excel e Google Fogli aprono) */}
      {items.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs text-[15px] text-ink-soft">{it.cassa.esportaSpiegaRep}</p>
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
                  href={`/c/${classCode}/cassa/movimenti${withFilters({
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

            <form
              action={`/c/${classCode}/cassa/movimenti`}
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
          </div>
        )}

        {items.length === 0 ? (
          <Card>
            <p className="text-ink-soft">{it.cassa.nessunMovimento}</p>
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
                  isRepresentative={true}
                  nomi={nomi}
                  showActions={true}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
