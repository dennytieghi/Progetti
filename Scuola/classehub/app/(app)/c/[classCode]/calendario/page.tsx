import Link from "next/link";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { PannelloBacheca } from "../PannelloBacheca";
import { caricaDatiBacheca } from "../bacheca-dati";
import { POST_TYPE_STYLE } from "@/components/posts/type-style";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import {
  aggiungiGiorni,
  dataValida,
  giornoItaliano,
  grigliaMese,
  raggruppaPerGiorno,
  settimanaDi,
  spostaMese,
  tipoDominante,
  type CellaGiorno,
} from "@/lib/calendario/calendario";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";

export const metadata = { title: `${it.calendario.titolo} — ${it.app.name}` };

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ vista?: string; data?: string; giorno?: string }>;
}) {
  const { classCode } = await params;
  const sp = await searchParams;
  const ctx = await requireActiveMembership(classCode);
  const dati = await caricaDatiBacheca(ctx, { includeArchived: false });

  // Stato dall'URL, con default sicuri.
  const vista = sp.vista === "settimana" ? "settimana" : "mese";
  const oggi = giornoItaliano(new Date().toISOString());
  const ancora = dataValida(sp.data) ? sp.data : oggi;
  const selezionato = dataValida(sp.giorno) ? sp.giorno : null;

  const perGiorno = raggruppaPerGiorno(dati.attivi);
  const [anno, mese] = [Number(ancora.slice(0, 4)), Number(ancora.slice(5, 7))];
  const settimane: CellaGiorno[][] =
    vista === "mese"
      ? grigliaMese(anno, mese)
      : [settimanaDi(ancora).map((data) => ({ data, nelMese: true }))];

  const base = `/c/${classCode}/calendario`;
  function url(over: { vista?: string; data?: string; giorno?: string | null }): string {
    const q = new URLSearchParams();
    const v = over.vista ?? vista;
    if (v !== "mese") q.set("vista", v);
    const d = over.data ?? ancora;
    if (d !== oggi) q.set("data", d);
    const g = over.giorno === undefined ? selezionato : over.giorno;
    if (g) q.set("giorno", g);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  }

  const prec = vista === "mese" ? spostaMese(ancora, -1) : aggiungiGiorni(ancora, -7);
  const succ = vista === "mese" ? spostaMese(ancora, 1) : aggiungiGiorni(ancora, 7);

  const titoloPeriodo =
    vista === "mese"
      ? capitalizza(
          new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(
            new Date(`${ancora.slice(0, 7)}-01T12:00:00Z`)
          )
        )
      : it.calendario.settimanaDal
          .replace("{dal}", giornoBreveIt(settimane[0]![0]!.data))
          .replace("{al}", giornoBreveIt(settimane[0]![6]!.data));

  // Elenco: il giorno selezionato (se cade nel periodo), altrimenti
  // tutto il periodo. Primo blocco scadenze+pinnati, poi il resto,
  // entrambi in ordine di giorno.
  const giorniPeriodo = settimane
    .flat()
    .filter((c) => c.nelMese)
    .map((c) => c.data);
  const giorniElenco =
    selezionato && giorniPeriodo.includes(selezionato) ? [selezionato] : giorniPeriodo;
  const postPeriodo = giorniElenco.flatMap((g) => perGiorno.get(g) ?? []);
  const inEvidenza = postPeriodo.filter((p) => p.type === "deadline" || p.pinned);
  const altri = postPeriodo.filter((p) => !(p.type === "deadline" || p.pinned));
  const titoloElenco =
    giorniElenco.length === 1
      ? capitalizza(
          new Intl.DateTimeFormat("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date(`${giorniElenco[0]}T12:00:00Z`))
        )
      : titoloPeriodo;

  const nome = (ctx.profile?.display_name ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="font-body">
      <PannelloBacheca
        classCode={classCode}
        nome={nome}
        isRepresentative={ctx.isRepresentative}
        dati={dati}
        attiva="calendario"
      />

      {/* Testata del calendario: periodo + navigazione + vista */}
      <div className="mb-4 mt-[26px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={url({ data: prec, giorno: null })}
            aria-label={it.calendario.periodoPrec}
            className="flex size-12 items-center justify-center rounded-full text-ink-soft hover:bg-paper-hover hover:text-ink"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <h2 className="min-w-40 text-center font-display text-[22px] font-bold">
            {titoloPeriodo}
          </h2>
          <Link
            href={url({ data: succ, giorno: null })}
            aria-label={it.calendario.periodoSucc}
            className="flex size-12 items-center justify-center rounded-full text-ink-soft hover:bg-paper-hover hover:text-ink"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
          <Link
            href={url({ data: oggi, giorno: null })}
            className="ml-1 flex min-h-12 items-center rounded-full border border-hairline px-4 text-[15px] font-semibold text-ink-soft hover:border-brand hover:text-ink"
          >
            {it.calendario.oggi}
          </Link>
        </div>
        <div className="flex gap-1 rounded-full border border-hairline p-1">
          {(
            [
              { key: "settimana", label: it.calendario.vistaSettimana },
              { key: "mese", label: it.calendario.vistaMese },
            ] as const
          ).map((v) => (
            <Link
              key={v.key}
              href={url({ vista: v.key, giorno: null })}
              className={cn(
                "flex min-h-10 items-center rounded-full px-4 text-[15px] font-semibold",
                vista === v.key
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:bg-paper-hover hover:text-ink"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Griglia */}
      <div className="rounded-2xl border border-hairline bg-paper p-3">
        <div className="grid grid-cols-7 gap-1">
          {it.calendario.giorniBrevi.map((g) => (
            <span
              key={g}
              className="py-1 text-center text-[15px] font-bold uppercase tracking-[0.03em] text-ink-faint"
            >
              {g}
            </span>
          ))}
          {settimane.flat().map((cella) => {
            const posts = perGiorno.get(cella.data) ?? [];
            const dominante = tipoDominante(posts.map((p) => p.type));
            const stile = dominante ? POST_TYPE_STYLE[dominante] : null;
            const haScadenza = posts.some((p) => p.type === "deadline");
            const haPinnato = posts.some((p) => p.pinned);
            const tipiPresenti = [
              ...new Set(posts.map((p) => p.type)),
            ].map((t) => POST_TYPE_STYLE[t].dot);
            const eSelezionato = cella.data === selezionato;
            const eOggi = cella.data === oggi;
            return (
              <Link
                key={cella.data}
                href={url({ giorno: eSelezionato ? null : cella.data })}
                aria-label={cella.data}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-transparent text-[16px]",
                  vista === "settimana" && "min-h-20",
                  !cella.nelMese && "opacity-40",
                  stile && !eSelezionato && stile.pinBox,
                  stile && !eSelezionato && stile.pinText,
                  stile && !eSelezionato && "font-semibold",
                  !stile && !eSelezionato && "text-ink hover:bg-paper-hover",
                  haScadenza && !eSelezionato && "border-scadenza",
                  eSelezionato && (stile ? stile.chip : "bg-brand text-white"),
                  eSelezionato && "font-bold",
                  eOggi && "ring-2 ring-brand ring-offset-1"
                )}
              >
                {haPinnato && (
                  <Pin
                    aria-hidden
                    className="absolute right-1 top-1 size-3 text-urgente"
                  />
                )}
                {Number(cella.data.slice(8, 10))}
                {tipiPresenti.length > 0 && (
                  <span aria-hidden className="flex gap-0.5">
                    {tipiPresenti.map((dot) => (
                      <span
                        key={dot}
                        className={cn("size-[7px] rounded-full", dot)}
                      />
                    ))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-4 mt-[26px] flex items-center gap-2.5">
        <span className="whitespace-nowrap text-[15px] font-bold uppercase tracking-[0.07em] text-ink-faint">
          {titoloElenco}
        </span>
        <span aria-hidden className="h-px flex-1 bg-hairline" />
        {giorniElenco.length === 1 && (
          <Link
            href={url({ giorno: null })}
            className="whitespace-nowrap text-[15px] font-semibold text-brand underline underline-offset-4"
          >
            {vista === "mese" ? it.calendario.mostraMese : it.calendario.mostraSettimana}
          </Link>
        )}
      </div>

      {postPeriodo.length === 0 ? (
        <EmptyState
          emoji="🗓️"
          title={
            giorniElenco.length === 1 ? it.calendario.vuotoGiorno : it.calendario.vuoto
          }
          text=""
        />
      ) : (
        <ul className="space-y-2.5">
          {[...inEvidenza, ...altri].map((post) => (
            <li key={post.id}>
              <PostCard post={post} classCode={classCode} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function capitalizza(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "2026-07-06" → "6 lug" (per il titolo della settimana). */
function giornoBreveIt(ymd: string): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(
    new Date(`${ymd}T12:00:00Z`)
  );
}
