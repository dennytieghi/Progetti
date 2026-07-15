import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/require-membership";
import { listClassesForUser } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";

export const metadata = { title: `${it.classi.titolo} — ${it.app.name}` };

/**
 * Le mie classi: una card per iscrizione. I nomi delle classi si
 * leggono con listClassesForUser (admin): un pending non può leggere la
 * riga della classe via RLS, ma il nome della SUA richiesta sì.
 */
export default async function ClassiPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/accedi");

  const cards = await listClassesForUser(ctx.user.id);
  if (cards.length === 0) redirect("/benvenuto");

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-10 font-body">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-bold">{it.classi.titolo}</h1>
        <p className="mt-2 text-ink-soft">{it.classi.sottotitolo}</p>
      </div>

      <ul className="space-y-2.5">
        {cards.map(({ membership, klass }) => {
          if (!klass) return null;
          const attiva = membership.status === "active";
          const contenuto = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[22px] font-semibold leading-snug">
                  {klass.name}
                </span>
                {!attiva && (
                  <span className="mt-1 flex items-center gap-1.5 text-[15px] text-ink-soft">
                    <Clock className="size-4" aria-hidden /> {it.classi.inAttesa}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[15px] font-semibold",
                  membership.role === "representative"
                    ? "bg-brand text-white"
                    : "bg-paper-hover text-ink-soft"
                )}
              >
                {membership.role === "representative"
                  ? it.header.ruoloRappresentante
                  : it.header.ruoloGenitore}
              </span>
            </>
          );
          return (
            <li key={membership.id}>
              {attiva ? (
                <Link
                  href={`/c/${klass.class_code}`}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-paper p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_8px_20px_rgba(20,20,30,0.08)]"
                >
                  {contenuto}
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-paper-soft p-5 opacity-80">
                  {contenuto}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/entra" className={buttonClasses("secondary")}>
          {it.classi.entraAltra}
        </Link>
        <Link href="/crea-classe" className={buttonClasses("ghost")}>
          {it.classi.creaAltra}
        </Link>
      </div>
    </div>
  );
}
