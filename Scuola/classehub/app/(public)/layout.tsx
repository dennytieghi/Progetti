import Link from "next/link";
import { it } from "@/lib/i18n/it";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-line bg-paper">
        <div className="mx-auto flex min-h-14 max-w-3xl items-center px-4">
          <Link href="/" className="text-[20px] font-bold text-accent">
            {it.app.name}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="no-print border-t border-line bg-paper py-4 text-center text-[15px] text-ink-soft">
        {it.app.name}
      </footer>
    </div>
  );
}
