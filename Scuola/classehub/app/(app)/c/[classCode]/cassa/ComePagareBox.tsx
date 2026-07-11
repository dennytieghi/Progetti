import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/shared/CopyButton";
import { buttonClasses } from "@/components/ui/Button";
import { it } from "@/lib/i18n/it";
import type { ClassRow } from "@/lib/db/types";

/**
 * Le coordinate del rappresentante, pronte da copiare. Compare solo
 * ciò che è compilato; se non c'è nulla il chiamante non renderizza.
 */
export function ComePagareBox({ klass }: { klass: ClassRow }) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-[19px] font-bold">{it.cassa.comePagareTitolo}</h2>
        <p className="mt-1 text-[15px] text-ink-soft">{it.cassa.comePagareSpiega}</p>
      </div>
      <ul className="space-y-3">
        {klass.payment_iban && (
          <li className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold text-ink-soft">
                {it.cassa.comePagareIban}
                {klass.payment_iban_holder
                  ? ` — ${it.cassa.comePagareIntestato} ${klass.payment_iban_holder}`
                  : ""}
              </p>
              <p className="break-all text-[17px] font-semibold">{klass.payment_iban}</p>
            </div>
            <CopyButton text={klass.payment_iban} />
          </li>
        )}
        {klass.payment_paypal && (
          <li className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[17px] font-semibold">PayPal</p>
            <a
              href={klass.payment_paypal}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary")}
            >
              {it.cassa.comePagareApriPaypal}
            </a>
          </li>
        )}
        {klass.payment_satispay && (
          <li className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold text-ink-soft">Satispay</p>
              <p className="text-[17px] font-semibold">{klass.payment_satispay}</p>
            </div>
            <CopyButton text={klass.payment_satispay} />
          </li>
        )}
      </ul>
    </Card>
  );
}
