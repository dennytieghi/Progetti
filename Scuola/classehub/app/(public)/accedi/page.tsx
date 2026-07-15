import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/shared/Banner";
import { it } from "@/lib/i18n/it";
import { AccediForm } from "./AccediForm";
import { GoogleButton } from "./GoogleButton";

export const metadata = { title: `${it.accedi.titolo} — ${it.app.name}` };

/** Porta di rientro per chi è già registrato (spec V1.5). */
export default async function AccediPage({
  searchParams,
}: {
  searchParams: Promise<{ inviato?: string; demo?: string }>;
}) {
  const { inviato, demo } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 font-body">
      <div className="pt-6 text-center">
        <h1 className="font-display text-[28px] font-bold">{it.accedi.titolo}</h1>
        <p className="mt-2 text-ink-soft">{it.accedi.sottotitolo}</p>
      </div>

      {inviato === "1" && (
        <div aria-live="polite" className="space-y-3">
          <Banner tone="success">{it.accedi.inviato}</Banner>
          {demo && demo.startsWith("/auth/callback") && (
            <Card className="space-y-2 border-warning/40 bg-warning-light">
              <p className="text-[15px] font-semibold">
                {it.controllaEmail.demoTitolo}
              </p>
              <p className="text-[15px]">{it.controllaEmail.demoTesto}</p>
              <Link href={demo} className={buttonClasses("primary", "lg")}>
                {it.controllaEmail.demoBottone}
              </Link>
              <p className="text-[15px] text-ink-soft">{it.accedi.linkPersonale}</p>
            </Card>
          )}
        </div>
      )}

      <Card>
        <AccediForm />
      </Card>

      {process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1" && (
        <>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-hairline" />
            <span className="text-[15px] text-ink-faint">{it.accedi.oppure}</span>
            <span aria-hidden className="h-px flex-1 bg-hairline" />
          </div>
          <GoogleButton />
        </>
      )}
    </div>
  );
}
