import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button, buttonClasses } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/require-membership";
import { listClassesForUser } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { esciAction } from "./actions";

export const metadata = { title: `${it.account.titolo} — ${it.app.name}` };

export default async function AccountPage() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/");

  const classes = listClassesForUser(ctx.user.id);

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <div>
        <p className="text-[15px] font-semibold text-accent">{it.app.name}</p>
        <h1 className="text-[28px] font-bold">{it.account.titolo}</h1>
        <p className="text-ink-soft">
          {ctx.profile?.display_name} · {ctx.user.email}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-[22px] font-bold">{it.account.leTueClassi}</h2>
        {classes.length === 0 ? (
          <EmptyState emoji="🏫" title={it.account.nessunaClasse} text="">
            <Link href="/entra" className={buttonClasses("primary", "md")}>
              {it.account.entraInClasse}
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {classes.map(({ membership, klass }) => (
              <li key={membership.id}>
                <Link
                  href={
                    membership.status === "active"
                      ? `/c/${klass.class_code}`
                      : `/in-attesa?classe=${klass.class_code}`
                  }
                  className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4 hover:border-accent"
                >
                  <span>
                    <span className="block font-semibold">{klass.name}</span>
                    <span className="text-[15px] text-ink-soft">
                      {membership.role === "representative"
                        ? it.membri.rappresentante
                        : membership.status === "pending"
                          ? it.inAttesa.titolo
                          : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={esciAction}>
        <Button type="submit" variant="secondary" size="lg">
          <LogOut className="size-5" aria-hidden /> {it.account.esciConferma}
        </Button>
      </form>
    </div>
  );
}
