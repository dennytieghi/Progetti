import Link from "next/link";
import {
  Home,
  Inbox,
  MessageSquarePlus,
  Plus,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";

/**
 * Header della classe. Poche voci, sempre visibili, icone SEMPRE con
 * etichetta testuale (UX_PRINCIPLES §anti-pattern). Con la Cassa il
 * rappresentante arriva a 5 voci: su schermi stretti la barra scorre.
 */
export function AppHeader({
  classCode,
  className,
  isRepresentative,
  openRequestsCount = 0,
}: {
  classCode: string;
  className: string;
  isRepresentative: boolean;
  openRequestsCount?: number;
}) {
  const base = `/c/${classCode}`;

  const items = isRepresentative
    ? [
        { href: base, label: it.bacheca.titolo, icon: Home },
        { href: `${base}/nuovo`, label: it.bacheca.nuovoPost, icon: Plus },
        {
          href: `${base}/richieste`,
          label: it.richieste.titoloRep,
          icon: Inbox,
          badge: openRequestsCount,
        },
        { href: `${base}/cassa`, label: it.cassa.titolo, icon: Wallet },
        { href: `${base}/impostazioni`, label: it.impostazioni.titolo, icon: Settings },
      ]
    : [
        { href: base, label: it.bacheca.titolo, icon: Home },
        {
          href: `${base}/invia-richiesta`,
          label: it.richieste.titoloGenitore,
          icon: MessageSquarePlus,
        },
        { href: `${base}/cassa`, label: it.cassa.titolo, icon: Wallet },
        { href: "/account", label: it.account.titolo, icon: UserRound },
      ];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto max-w-3xl px-4 pt-3">
        <p className="text-[15px] font-semibold text-accent">{it.app.name}</p>
        <h1 className="truncate text-[22px] font-bold leading-tight">{className}</h1>
      </div>
      <nav className="mx-auto max-w-3xl overflow-x-auto px-2">
        <ul className="flex">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-12 items-center gap-1.5 whitespace-nowrap px-3 py-2",
                  "text-[16px] font-semibold text-ink-soft hover:text-accent"
                )}
              >
                <item.icon className="size-5 shrink-0" aria-hidden />
                {item.label}
                {"badge" in item && typeof item.badge === "number" && item.badge > 0 && (
                  <span className="ml-0.5 rounded-full bg-accent px-2 text-[14px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
