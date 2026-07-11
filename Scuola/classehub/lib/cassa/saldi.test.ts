import { describe, expect, it as test } from "vitest";
import { testoSaldoPersonale } from "./saldi";

// Non-breaking space used by Intl.NumberFormat with it-IT locale
const nbsp = " ";

describe("testoSaldoPersonale", () => {
  test("positivo: importo formattato dentro la frase", () => {
    const r = testoSaldoPersonale(4650);
    expect(r.testo).toBe(`Hai ancora 46,50${nbsp}€ in cassa.`);
    expect(r.negativo).toBe(false);
  });
  test("zero: frase fissa", () => {
    const r = testoSaldoPersonale(0);
    expect(r.testo).toBe("Hai usato tutto quello che avevi versato.");
    expect(r.negativo).toBe(false);
  });
  test("negativo: importo in valore assoluto e flag rosso", () => {
    const r = testoSaldoPersonale(-350);
    expect(r.testo).toBe(`Devi versare 3,50${nbsp}€.`);
    expect(r.negativo).toBe(true);
  });
});
