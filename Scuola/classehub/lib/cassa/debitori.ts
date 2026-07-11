/**
 * Divide i membri attivi tra chi deve versare (saldo negativo) e chi è
 * a posto. Chi non compare nella mappa dei saldi non ha movimenti: 0.
 * Logica pura, usata da home cassa e pagina versamento.
 */

export interface SaldoMembro {
  userId: string;
  name: string;
  cents: number;
}

export function dividiPerSaldo(
  membri: Array<{ userId: string; name: string }>,
  saldi: Map<string, number>
): { debitori: SaldoMembro[]; aPosto: SaldoMembro[]; totaleDovutoCents: number } {
  const debitori: SaldoMembro[] = [];
  const aPosto: SaldoMembro[] = [];
  for (const m of membri) {
    const cents = saldi.get(m.userId) ?? 0;
    (cents < 0 ? debitori : aPosto).push({ ...m, cents });
  }
  debitori.sort((a, b) => a.cents - b.cents); // più negativo prima
  aPosto.sort((a, b) => a.name.localeCompare(b.name, "it"));
  const totaleDovutoCents = debitori.reduce((s, m) => s - m.cents, 0);
  return { debitori, aPosto, totaleDovutoCents };
}
