import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { it } from "@/lib/i18n/it";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 pt-16 text-center">
      <p className="text-5xl" aria-hidden>
        🔍
      </p>
      <p className="text-[19px]">{it.errori.paginaNonTrovata}</p>
      <Link href="/" className={buttonClasses("primary", "lg")}>
        {it.auth.tornaInizio}
      </Link>
    </div>
  );
}
