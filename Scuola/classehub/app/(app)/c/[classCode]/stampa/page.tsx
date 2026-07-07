import Link from "next/link";
import { PrintButton } from "@/components/shared/PrintButton";
import { Banner } from "@/components/shared/Banner";
import { buttonClasses } from "@/components/ui/Button";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { consumeOneTimeSecret } from "@/lib/db/mutations";
import { getBaseUrl } from "@/lib/base-url";
import { it } from "@/lib/i18n/it";

export const metadata = { title: `${it.stampa.titolo} — ${it.app.name}` };

/**
 * Foglio stampabile per i genitori: codice classe + istruzioni.
 * Il codice di emergenza compare UNA sola volta (subito dopo la
 * creazione della classe, via segreto one-time); poi solo l'avviso.
 */
export default async function StampaPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ segreto?: string }>;
}) {
  const { classCode } = await params;
  const { segreto } = await searchParams;
  const ctx = await requireRepresentative(classCode);

  const emergencyCode = segreto ? await consumeOneTimeSecret(segreto, ctx.klass.id) : null;
  const baseUrl = (await getBaseUrl()).replace(/^https?:\/\//, "");

  const steps = [
    { text: it.stampa.passo1, extra: baseUrl },
    { text: it.stampa.passo2, extra: null },
    { text: it.stampa.passo3, extra: null },
    { text: it.stampa.passo4, extra: null },
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <PrintButton label={it.stampa.stampa} />
        <Link href={`/c/${classCode}`} className={buttonClasses("secondary", "md")}>
          {it.bacheca.titolo}
        </Link>
      </div>

      {emergencyCode && (
        <div className="no-print">
          <Banner tone="warning">{it.stampa.emergenzaTesto}</Banner>
        </div>
      )}

      <div className="rounded-2xl border-2 border-ink bg-paper p-8">
        <h1 className="text-center text-[32px] font-bold">{it.stampa.titolo}</h1>
        <p className="mt-1 text-center text-[20px]">
          {it.stampa.perLaClasse} <strong>{ctx.klass.name}</strong>
        </p>

        <div className="my-6 rounded-2xl bg-paper-soft py-6 text-center">
          <p className="font-semibold">{it.impostazioni.codiceClasse}</p>
          <p className="text-[48px] font-bold tracking-[0.3em]">
            {ctx.klass.class_code}
          </p>
        </div>

        <h2 className="text-[24px] font-bold">{it.stampa.istruzioniTitolo}</h2>
        <ol className="mt-3 space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[16px] font-bold text-white"
                aria-hidden
              >
                {i + 1}
              </span>
              <span>
                {step.text}
                {step.extra && (
                  <strong className="block text-[22px]">{step.extra}</strong>
                )}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border-2 border-dashed border-danger p-5">
          <h2 className="text-[20px] font-bold text-danger">
            {it.stampa.emergenzaTitolo}
          </h2>
          {emergencyCode ? (
            <>
              <p className="mt-2 text-[16px]">{it.stampa.emergenzaTesto}</p>
              <p className="mt-3 text-center text-[32px] font-bold tracking-[0.2em]">
                {emergencyCode}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[16px] text-ink-soft">
              {it.stampa.emergenzaGiaVisto}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
