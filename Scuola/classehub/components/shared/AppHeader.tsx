"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/cn";

/**
 * Navigazione della classe (docs/DESIGN.md §Sidebar).
 * Da md in su: sidebar bianca con bordo destro, voce attiva su indaco
 * pieno, avatar con iniziali in fondo. Sotto md: barra in alto (i
 * genitori arrivano da WhatsApp sul telefono), stesse voci e stessi
 * colori. Icone SEMPRE con etichetta testuale (UX_PRINCIPLES).
 * Client component solo per evidenziare la voce attiva (usePathname).
 */

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

function iniziali(nome: string): string {
  const parti = nome.trim().split(/\s+/).filter(Boolean);
  const lettere = parti.slice(0, 2).map((p) => p[0]!.toUpperCase());
  return lettere.join("") || "?";
}

export function AppHeader({
  classCode,
  className,
  displayName,
  isRepresentative,
  openRequestsCount = 0,
  pendingDeclarationsCount = 0,
}: {
  classCode: string;
  className: string;
  displayName: string;
  isRepresentative: boolean;
  openRequestsCount?: number;
  pendingDeclarationsCount?: number;
}) {
  const base = `/c/${classCode}`;
  const pathname = usePathname();

  const items: NavItem[] = isRepresentative
    ? [
        { href: base, label: it.bacheca.titolo, icon: Home },
        { href: `${base}/nuovo`, label: it.bacheca.nuovoPost, icon: Plus },
        ...(FEATURES.richieste
          ? [
              {
                href: `${base}/richieste`,
                label: it.richieste.titoloRep,
                icon: Inbox,
                badge: openRequestsCount,
              },
            ]
          : []),
        {
          href: `${base}/cassa`,
          label: it.cassa.titolo,
          icon: Wallet,
          badge: pendingDeclarationsCount,
        },
        { href: `${base}/impostazioni`, label: it.impostazioni.titolo, icon: Settings },
      ]
    : [
        { href: base, label: it.bacheca.titolo, icon: Home },
        ...(FEATURES.richieste
          ? [
              {
                href: `${base}/invia-richiesta`,
                label: it.richieste.titoloGenitore,
                icon: MessageSquarePlus,
              },
            ]
          : []),
        { href: `${base}/cassa`, label: it.cassa.titolo, icon: Wallet },
        { href: "/account", label: it.account.titolo, icon: UserRound },
      ];

  // La bacheca è attiva anche sul dettaglio di un post (/p/...).
  function isActive(href: string): boolean {
    if (href === base) return pathname === base || pathname.startsWith(`${base}/p/`);
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const ruolo = isRepresentative
    ? it.header.ruoloRappresentante
    : it.header.ruoloGenitore;

  return (
    <>
      {/* Sidebar da md in su */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start border-r border-hairline bg-paper px-4 py-6 md:flex">
        <p className="font-display text-[20px] font-bold text-brand">{it.app.name}</p>
        <Link
          href="/classi"
          className="mb-6 mt-0.5 block text-[15px] leading-snug text-ink-faint underline-offset-4 hover:text-ink hover:underline"
        >
          {className}
        </Link>
        <ul className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-2.5 rounded-full px-3.5 py-2 text-[16px] transition-colors",
                    active
                      ? "bg-brand font-semibold text-white"
                      : "text-ink-soft hover:bg-paper-hover hover:text-ink"
                  )}
                >
                  <item.icon className="size-5 shrink-0" aria-hidden />
                  {item.label}
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span className="ml-auto rounded-full bg-urgente px-2 py-px text-[14px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-center gap-2.5 border-t border-hairline pt-4">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-[14px] font-bold text-white"
          >
            {iniziali(displayName)}
          </span>
          <span className="min-w-0 text-[15px] leading-snug text-ink-faint">
            <b className="block truncate text-[16px] font-semibold text-ink">
              {displayName}
            </b>
            {ruolo}
          </span>
        </div>
      </aside>

      {/* Barra in alto sotto md (telefono: touch target 48px) */}
      <header className="no-print sticky top-0 z-40 border-b border-hairline bg-paper md:hidden">
        <div className="px-4 pt-3">
          <p className="font-display text-[15px] font-bold text-brand">{it.app.name}</p>
          <h1 className="truncate text-[22px] font-bold leading-tight">
            <Link href="/classi" className="underline-offset-4 hover:underline">
              {className}
            </Link>
          </h1>
        </div>
        <nav className="overflow-x-auto px-2">
          <ul className="flex gap-1 py-1">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[16px] font-semibold",
                      active
                        ? "bg-brand text-white"
                        : "text-ink-soft hover:bg-paper-hover hover:text-ink"
                    )}
                  >
                    <item.icon className="size-5 shrink-0" aria-hidden />
                    {item.label}
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="ml-0.5 rounded-full bg-urgente px-2 text-[14px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
    </>
  );
}
