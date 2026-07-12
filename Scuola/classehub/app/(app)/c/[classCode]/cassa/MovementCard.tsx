import Link from "next/link";
import { Pencil } from "lucide-react";
import { ConfirmSubmit } from "@/components/shared/ConfirmSubmit";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { type MovimentoConQuote } from "@/lib/cassa/saldi";
import { formatEuroCents } from "@/lib/euro";
import { formatShortDateIt } from "@/lib/format-date";
import { it } from "@/lib/i18n/it";
import { cn } from "@/lib/cn";
import type { PaymentMethod } from "@/lib/db/types";
import { eliminaMovimentoAction } from "./actions";

/** Riusata dai form e dalle pagine che elencano i genitori della classe. */
export interface MemberOption {
  userId: string;
  name: string;
}

/** Riusata anche dal Task 8-9 per mostrare il metodo nei movimenti. */
export const METODO_LABEL: Record<PaymentMethod, string> = {
  contanti: it.cassa.metodoContanti,
  bonifico: it.cassa.metodoBonifico,
  satispay: it.cassa.metodoSatispay,
  paypal: it.cassa.metodoPaypal,
  altro: it.cassa.metodoAltro,
};

export function MovementCard({
  item,
  classCode,
  userId,
  isRepresentative,
  nomi,
  showActions,
}: {
  item: MovimentoConQuote;
  classCode: string;
  userId: string;
  isRepresentative: boolean;
  nomi: Map<string, string>;
  showActions: boolean;
}) {
  const { movement, shares } = item;
  const isDeposit = movement.kind === "deposit";
  const myShare = shares.find((s) => s.user_id === userId);

  // Il rappresentante vede l'intestatario del versamento; per la spesa
  // basta il conteggio (i nomi sono nella sezione quote).
  const firstShare = shares[0];
  const intestatario =
    isDeposit && shares.length === 1 && firstShare
      ? nomi.get(firstShare.user_id)
      : null;
  const perHead = !isDeposit && firstShare ? firstShare.amount_cents : null;
  // Il genitore riceve solo la propria quota (RLS): i partecipanti si
  // contano dal totale, non dalle quote visibili. Il rappresentante
  // le vede tutte: per lui il conteggio è esatto.
  const partecipanti = isRepresentative
    ? shares.length
    : perHead
      ? Math.round(movement.total_cents / perHead)
      : 0;
  // Coi centesimi di resto le quote possono differire di 1 centesimo:
  // "× a testa" si mostra solo se sono davvero tutte uguali.
  const quoteUguali =
    perHead !== null && shares.every((s) => s.amount_cents === perHead);

  return (
    <Card className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-soft">
          {isDeposit ? it.cassa.versamento : it.cassa.spesa}
          {isDeposit ? ` · ${METODO_LABEL[movement.method]}` : ""}
        </p>
        <p className="text-[18px] font-semibold">{movement.title}</p>
        <p className="text-[15px] text-ink-soft">
          {formatShortDateIt(movement.created_at)}
          {intestatario ? ` · ${intestatario}` : ""}
          {perHead !== null
            ? isRepresentative
              ? ` · ${partecipanti} ${partecipanti === 1 ? it.cassa.partecipante : it.cassa.partecipanti}${quoteUguali ? ` × ${formatEuroCents(perHead)} ${it.cassa.aTesta}` : ""}`
              : ` · ${it.cassa.spesaDiClasse} · ${partecipanti} ${partecipanti === 1 ? it.cassa.partecipante : it.cassa.partecipanti}`
            : ""}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <p
          className={cn(
            "text-[20px] font-bold",
            isDeposit ? "text-success" : "text-danger"
          )}
        >
          {isDeposit ? "+" : "−"}
          {formatEuroCents(
            isRepresentative ? movement.total_cents : (myShare?.amount_cents ?? 0)
          )}
        </p>
        {isRepresentative && showActions && (
          <div className="flex gap-2">
            {!isDeposit && (
              <Link
                href={`/c/${classCode}/cassa/spesa/${movement.id}`}
                className={buttonClasses("secondary")}
              >
                <Pencil className="size-5" aria-hidden /> {it.cassa.modificaSpesa}
              </Link>
            )}
            <ConfirmSubmit
              action={eliminaMovimentoAction}
              triggerLabel={it.cassa.elimina}
              title={it.cassa.eliminaTitolo}
              description={it.cassa.eliminaTesto}
              confirmLabel={it.cassa.eliminaSi}
              cancelLabel={it.cassa.eliminaNo}
              variant="secondary"
            >
              <input type="hidden" name="classCode" value={classCode} />
              <input type="hidden" name="movementId" value={movement.id} />
            </ConfirmSubmit>
          </div>
        )}
      </div>
    </Card>
  );
}
