import Link from "next/link";
import { Megaphone, ShieldCheck, Users } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { it } from "@/lib/i18n/it";

export default function LandingPage() {
  const steps = [
    { icon: Users, title: it.landing.passo1Titolo, text: it.landing.passo1Testo },
    { icon: ShieldCheck, title: it.landing.passo2Titolo, text: it.landing.passo2Testo },
    { icon: Megaphone, title: it.landing.passo3Titolo, text: it.landing.passo3Testo },
  ];

  return (
    <div className="space-y-10">
      <section className="pt-6 text-center">
        <h1 className="mx-auto max-w-xl text-[32px] font-bold leading-tight">
          {it.landing.titolo}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[19px] text-ink-soft">
          {it.landing.sottotitolo}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-3 text-center">
          <p className="text-4xl" aria-hidden>
            🏫
          </p>
          <p className="text-ink-soft">{it.landing.creaClasseSpiega}</p>
          <Link href="/crea-classe" className={buttonClasses("primary", "lg")}>
            {it.landing.creaClasseCta}
          </Link>
        </Card>
        <Card className="flex flex-col gap-3 text-center">
          <p className="text-4xl" aria-hidden>
            👋
          </p>
          <p className="text-ink-soft">{it.landing.entraSpiega}</p>
          <Link href="/entra" className={buttonClasses("secondary", "lg")}>
            {it.landing.entraCta}
          </Link>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-center text-[24px] font-bold">
          {it.landing.comeFunzionaTitolo}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent text-[16px] font-bold text-white">
                    {i + 1}
                  </span>
                  <step.icon className="size-6 text-accent" aria-hidden />
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-[16px] text-ink-soft">{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
