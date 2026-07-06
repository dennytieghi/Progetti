import Link from "next/link";
import { MailCheck } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { it } from "@/lib/i18n/it";

export const metadata = { title: `${it.controllaEmail.titolo} — ${it.app.name}` };

/**
 * Schermata "controlla la tua email".
 * PoC: mostra anche il pulsante demo che apre direttamente il link
 * (in produzione l'email parte davvero e questo blocco sparisce).
 */
export default async function ControllaEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8 text-center">
      <MailCheck className="mx-auto size-14 text-accent" aria-hidden />
      <h1 className="text-[28px] font-bold">{it.controllaEmail.titolo}</h1>
      <p className="text-ink-soft">{it.controllaEmail.testo}</p>
      <p className="text-[16px] text-ink-soft">{it.controllaEmail.spam}</p>

      {demo && (
        <Card className="space-y-3 border-warning/40 bg-warning-light text-left">
          <p className="font-semibold text-warning">{it.controllaEmail.demoTitolo}</p>
          <p className="text-[16px]">{it.controllaEmail.demoTesto}</p>
          <Link
            href={`/auth/callback?token=${encodeURIComponent(demo)}`}
            className={buttonClasses("primary", "lg")}
          >
            {it.controllaEmail.demoBottone}
          </Link>
        </Card>
      )}
    </div>
  );
}
