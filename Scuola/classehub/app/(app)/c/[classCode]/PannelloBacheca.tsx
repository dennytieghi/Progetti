// app/(app)/c/[classCode]/PannelloBacheca.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import type { DatiBacheca } from "./bacheca-dati";

/**
 * Pannello riepilogo condiviso tra bacheca (annunci) e calendario:
 * saluto + toggle vista + bottone Pubblica + barra statistiche.
 * I segmenti statistica portano SEMPRE alla bacheca (vista=...).
 */
export function PannelloBacheca({
  classCode,
  nome,
  isRepresentative,
  dati,
  attiva,
}: {
  classCode: string;
  nome: string;
  isRepresentative: boolean;
  dati: DatiBacheca;
  attiva: "annunci" | "calendario";
}) {
  const base = `/c/${classCode}`;
  const stats: Array<{ dot: string; label: string; num: number; href: string | null }> = [
    {
      dot: "bg-avviso",
      label: it.bacheca.statAvvisiNuovi,
      num: dati.nuoviPosts.length,
      href: dati.nuoviPosts.length > 0 ? `${base}?vista=nuovi` : null,
    },
    {
      dot: "bg-scadenza",
      label: it.bacheca.statScadenzeAperte,
      num: dati.deadlines.length,
      href: dati.deadlines.length > 0 ? `${base}?vista=scadenze` : null,
    },
    {
      dot: "bg-sondaggio",
      label: it.bacheca.statSondaggiAperti,
      num: dati.sondaggiAperti.length,
      href:
        dati.sondaggiAperti.length === 1
          ? `${base}/p/${dati.sondaggiAperti[0]!.slug}`
          : dati.sondaggiAperti.length > 1
            ? `${base}?vista=sondaggi`
            : null,
    },
  ];

  const TOGGLE = [
    { key: "annunci", label: it.bacheca.toggleAnnunci, href: base },
    { key: "calendario", label: it.bacheca.toggleCalendario, href: `${base}/calendario` },
  ] as const;

  return (
    <section className="rounded-[22px] border border-hairline bg-paper px-5 pb-1 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold">
            {it.bacheca.saluto.replace("{nome}", nome)}
          </h1>
          <p className="text-[16px] text-ink-soft">{it.bacheca.sottotitolo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-hairline p-1">
            {TOGGLE.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={attiva === t.key ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center rounded-full px-4 text-[16px] font-semibold",
                  attiva === t.key
                    ? "bg-brand text-white"
                    : "text-ink-soft hover:bg-paper-hover hover:text-ink"
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          {isRepresentative && (
            <Link
              href={`${base}/nuovo`}
              className="flex min-h-12 items-center gap-1 whitespace-nowrap rounded-full bg-brand px-5 text-[16px] font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(91,79,232,0.3)]"
            >
              <Plus className="size-4" aria-hidden /> {it.bacheca.nuovoPost}
            </Link>
          )}
        </div>
      </div>
      <div className="flex overflow-x-auto border-t border-hairline">
        {stats.map((stat) => {
          const contenuto = (
            <>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn("size-[7px] shrink-0 rounded-full", stat.dot)}
                />
                <span className="whitespace-nowrap text-[15px] text-ink-soft">
                  {stat.label}
                </span>
              </span>
              <span className="font-display text-[24px] font-bold">{stat.num}</span>
            </>
          );
          const classi =
            "flex min-w-24 flex-1 flex-col gap-1 border-l border-hairline px-4 py-3.5 first:border-l-0 first:pl-0.5";
          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(classi, "transition-colors hover:bg-paper-hover")}
            >
              {contenuto}
            </Link>
          ) : (
            <div key={stat.label} className={classi}>
              {contenuto}
            </div>
          );
        })}
      </div>
    </section>
  );
}
