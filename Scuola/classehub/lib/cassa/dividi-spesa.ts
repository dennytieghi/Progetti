/**
 * Divide una spesa totale (in centesimi) in quote intere tra n partecipanti.
 * I centesimi di resto vanno uno a uno ai primi: la somma delle quote è
 * SEMPRE uguale al totale, così i conti della cassa tornano al centesimo.
 * Logica pura, usata dalle Server Actions e dall'anteprima nel form.
 */
export function dividiSpesa(totalCents: number, count: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error(`Totale non valido: ${totalCents}`);
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Numero partecipanti non valido: ${count}`);
  }
  if (totalCents < count) {
    // Le quote devono essere di almeno 1 centesimo (vincolo del database).
    throw new Error(`Totale ${totalCents} troppo piccolo per ${count} quote`);
  }
  const base = Math.floor(totalCents / count);
  const resto = totalCents % count;
  return Array.from({ length: count }, (_, i) => (i < resto ? base + 1 : base));
}
