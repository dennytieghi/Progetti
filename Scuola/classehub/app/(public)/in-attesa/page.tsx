import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, RefreshCw } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Banner } from "@/components/shared/Banner";
import { getCurrentUser } from "@/lib/auth/require-membership";
import { getClassByCode, getMembership } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";

export const metadata = { title: `${it.inAttesa.titolo} — ${it.app.name}` };

/**
 * Schermata di attesa approvazione (ADR-011: un pending non vede nulla).
 * Il bottone "Controlla" ricarica questa pagina: se nel frattempo il
 * rappresentante ha approvato, il redirect porta in bacheca.
 */
export default async function InAttesaPage({
  searchParams,
}: {
  searchParams: Promise<{ classe?: string }>;
}) {
  const { classe } = await searchParams;
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/");

  const klass = classe ? getClassByCode(classe) : null;
  if (!klass) redirect("/account");

  const membership = getMembership(ctx.user.id, klass.id);
  if (!membership) redirect(`/entra?codice=${klass.class_code}`);
  if (membership.status === "active") redirect(`/c/${klass.class_code}`);

  if (membership.status === "rejected" || membership.status === "removed") {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-8 text-center">
        <p className="text-5xl" aria-hidden>
          🚫
        </p>
        <h1 className="text-[28px] font-bold">{it.inAttesa.rifiutataTitolo}</h1>
        <p className="text-ink-soft">{it.inAttesa.rifiutataTesto}</p>
        {membership.rejection_reason && (
          <Banner tone="warning">
            <span className="font-semibold">{it.inAttesa.rifiutataMotivo}</span>{" "}
            {membership.rejection_reason}
          </Banner>
        )}
        <Link
          href={`/entra?codice=${klass.class_code}`}
          className={buttonClasses("primary", "lg")}
        >
          {it.inAttesa.riprova}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8 text-center">
      <Clock className="mx-auto size-14 text-accent" aria-hidden />
      <h1 className="text-[28px] font-bold">{it.inAttesa.titolo}</h1>
      <p className="text-ink-soft">{it.inAttesa.testo}</p>
      <p className="text-[16px] text-ink-soft">{it.inAttesa.tempi}</p>
      <p className="text-[16px] text-ink-soft">{it.inAttesa.spam}</p>
      <Link
        href={`/in-attesa?classe=${klass.class_code}`}
        className={buttonClasses("secondary", "lg")}
      >
        <RefreshCw className="size-5" aria-hidden /> {it.inAttesa.ricontrolla}
      </Link>
    </div>
  );
}
