import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/require-membership";
import { it } from "@/lib/i18n/it";

export const metadata = { title: `${it.benvenuto.titolo} — ${it.app.name}` };

/** Sessione senza classi: le due uscite oneste (spec V1.5). */
export default async function BenvenutoPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/accedi");

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-10 font-body">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-bold">{it.benvenuto.titolo}</h1>
        <p className="mt-2 text-ink-soft">{it.benvenuto.testo}</p>
      </div>
      <Card className="space-y-3">
        <Link href="/entra" className={buttonClasses("primary", "lg")}>
          {it.benvenuto.entraCta}
        </Link>
        <Link href="/crea-classe" className={buttonClasses("secondary", "lg")}>
          {it.benvenuto.creaCta}
        </Link>
      </Card>
      <p className="text-center text-[15px] text-ink-soft">
        {it.benvenuto.googleDiverso}
      </p>
    </div>
  );
}
