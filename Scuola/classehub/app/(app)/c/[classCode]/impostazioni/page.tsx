import Link from "next/link";
import { ChevronRight, Printer, UserRound, UsersRound } from "lucide-react";
import { Banner } from "@/components/shared/Banner";
import { Card } from "@/components/ui/Card";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { countPendingMemberships } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { PagamentiForm } from "./PagamentiForm";

export const metadata = { title: `${it.impostazioni.titolo} — ${it.app.name}` };

export default async function ImpostazioniPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ pagamenti?: string }>;
}) {
  const { classCode } = await params;
  const { pagamenti } = await searchParams;
  const ctx = await requireRepresentative(classCode);
  const pendingCount = await countPendingMemberships(ctx.klass.id);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-bold">{it.impostazioni.titolo}</h1>

      {pagamenti === "1" && (
        <div aria-live="polite">
          <Banner tone="success">{it.impostazioni.pagamentiSalvate}</Banner>
        </div>
      )}

      <Card className="space-y-3 text-center">
        <p className="font-semibold text-ink-soft">{it.impostazioni.codiceClasse}</p>
        <p className="text-[40px] font-bold tracking-[0.3em] text-accent">
          {ctx.klass.class_code}
        </p>
        <p className="text-[16px] text-ink-soft">{it.impostazioni.codiceSpiega}</p>
        <Link
          href={`/c/${classCode}/stampa`}
          className="inline-flex min-h-12 items-center justify-center gap-2 font-semibold text-accent underline underline-offset-4"
        >
          <Printer className="size-5" aria-hidden /> {it.impostazioni.stampaFoglio}
        </Link>
      </Card>

      <nav aria-label={it.impostazioni.titolo}>
        <ul className="space-y-3">
          <li>
            <Link
              href={`/c/${classCode}/impostazioni/approvazioni`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4 font-semibold hover:border-accent"
            >
              <span className="flex items-center gap-3">
                <UserRound className="size-6 text-accent" aria-hidden />
                {it.impostazioni.approvazioniLink}
                {pendingCount > 0 && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-[15px] font-bold text-white">
                    {pendingCount} {it.impostazioni.inAttesaBadge}
                  </span>
                )}
              </span>
              <ChevronRight className="size-5 text-ink-soft" aria-hidden />
            </Link>
          </li>
          <li>
            <Link
              href={`/c/${classCode}/impostazioni/membri`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4 font-semibold hover:border-accent"
            >
              <span className="flex items-center gap-3">
                <UsersRound className="size-6 text-accent" aria-hidden />
                {it.impostazioni.membriLink}
              </span>
              <ChevronRight className="size-5 text-ink-soft" aria-hidden />
            </Link>
          </li>
          <li>
            <Link
              href="/account"
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4 font-semibold hover:border-accent"
            >
              <span className="flex items-center gap-3">
                <UserRound className="size-6 text-accent" aria-hidden />
                {it.account.titolo}
              </span>
              <ChevronRight className="size-5 text-ink-soft" aria-hidden />
            </Link>
          </li>
        </ul>
      </nav>

      <Card className="space-y-3">
        <h2 className="text-[19px] font-bold">{it.impostazioni.pagamentiTitolo}</h2>
        <p className="text-[15px] text-ink-soft">{it.impostazioni.pagamentiSpiega}</p>
        <PagamentiForm
          classCode={classCode}
          defaults={{
            iban: ctx.klass.payment_iban ?? "",
            ibanHolder: ctx.klass.payment_iban_holder ?? "",
            paypal: ctx.klass.payment_paypal ?? "",
            satispay: ctx.klass.payment_satispay ?? "",
          }}
        />
      </Card>
    </div>
  );
}
