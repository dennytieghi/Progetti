import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { it } from "@/lib/i18n/it";

export const metadata = { title: it.app.name };

export default function LinkNonValidoPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 pt-12 text-center">
      <p className="text-5xl" aria-hidden>
        ⏳
      </p>
      <p className="text-[19px]">{it.auth.linkNonValido}</p>
      <Link href="/" className={buttonClasses("primary", "lg")}>
        {it.auth.tornaInizio}
      </Link>
    </div>
  );
}
