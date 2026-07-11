import type { CashMovementRow, CashShareRow } from "@/lib/db/types";
import { formatEuroCents } from "@/lib/euro";
import { it } from "@/lib/i18n/it";

/**
 * Calcoli della cassa (logica pura, senza database).
 * Convenzione: i versamenti aggiungono, le spese tolgono.
 * Le quote (cash_shares) dicono su CHI pesa ogni movimento.
 */

export interface MovimentoConQuote {
  movement: CashMovementRow;
  shares: CashShareRow[];
}

/** Saldo dell'intera cassa: somma dei totali (versamenti - spese). */
export function saldoCassaCents(movements: CashMovementRow[]): number {
  return movements.reduce(
    (sum, m) => sum + (m.kind === "deposit" ? m.total_cents : -m.total_cents),
    0
  );
}

/** Saldo personale di un genitore: le sue quote, con segno. */
export function saldoPersonaleCents(
  items: MovimentoConQuote[],
  userId: string
): number {
  let sum = 0;
  for (const { movement, shares } of items) {
    const mine = shares.find((s) => s.user_id === userId);
    if (!mine) continue;
    sum += movement.kind === "deposit" ? mine.amount_cents : -mine.amount_cents;
  }
  return sum;
}

/** Saldi di tutti i membri coinvolti in almeno un movimento. */
export function saldiPerMembroCents(items: MovimentoConQuote[]): Map<string, number> {
  const saldi = new Map<string, number>();
  for (const { movement, shares } of items) {
    for (const share of shares) {
      const delta =
        movement.kind === "deposit" ? share.amount_cents : -share.amount_cents;
      saldi.set(share.user_id, (saldi.get(share.user_id) ?? 0) + delta);
    }
  }
  return saldi;
}

/** I movimenti che riguardano un genitore, con la sua quota a fianco. */
export function movimentiPersonali(
  items: MovimentoConQuote[],
  userId: string
): Array<{ movement: CashMovementRow; quotaCents: number }> {
  const result: Array<{ movement: CashMovementRow; quotaCents: number }> = [];
  for (const { movement, shares } of items) {
    const mine = shares.find((s) => s.user_id === userId);
    if (mine) result.push({ movement, quotaCents: mine.amount_cents });
  }
  return result;
}

/** La riga di contesto sotto "Quanto ti resta" (ADR-017). */
export function testoSaldoPersonale(cents: number): {
  testo: string;
  negativo: boolean;
} {
  if (cents === 0) return { testo: it.cassa.quantoRestaZero, negativo: false };
  const importo = formatEuroCents(Math.abs(cents));
  if (cents > 0) {
    return {
      testo: it.cassa.quantoRestaPositivo.replace("{importo}", importo),
      negativo: false,
    };
  }
  return {
    testo: it.cassa.quantoRestaNegativo.replace("{importo}", importo),
    negativo: true,
  };
}
