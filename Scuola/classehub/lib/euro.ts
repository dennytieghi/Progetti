/**
 * Importi in denaro: nel database vivono SEMPRE in centesimi (interi),
 * mai in virgola mobile — 0.1 + 0.2 in JavaScript non fa 0.3.
 */

/** "12,50" o "12.50" → 1250. Null se il testo non è un importo valido. */
export function parseEuroToCents(text: string): number | null {
  const match = text.trim().match(/^(\d{1,5})(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  const euros = parseInt(match[1] ?? "0", 10);
  const cents = parseInt((match[2] ?? "").padEnd(2, "0") || "0", 10);
  return euros * 100 + cents;
}

/** 1250 → "12,50" (per riempire i campi di input e il CSV). */
export function centsToEuroText(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** 1250 → "12,50 €" (formato italiano). */
export function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
