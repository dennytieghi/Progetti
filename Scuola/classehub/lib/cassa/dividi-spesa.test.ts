import { describe, expect, it as test } from "vitest";
import { dividiSpesa } from "./dividi-spesa";

describe("dividiSpesa", () => {
  test("divisione esatta: quote tutte uguali", () => {
    expect(dividiSpesa(1200, 4)).toEqual([300, 300, 300, 300]);
  });
  test("col resto: i primi prendono un centesimo in più", () => {
    // 10,00 € tra 3 → 3,34 + 3,33 + 3,33
    expect(dividiSpesa(1000, 3)).toEqual([334, 333, 333]);
  });
  test("resto di più centesimi: distribuiti uno a uno dai primi", () => {
    // 1,01 € tra 4 → 26 + 25 + 25 + 25
    expect(dividiSpesa(101, 4)).toEqual([26, 25, 25, 25]);
  });
  test("un solo partecipante: prende tutto", () => {
    expect(dividiSpesa(4599, 1)).toEqual([4599]);
  });
  test("la somma delle quote è sempre il totale", () => {
    for (const [totale, n] of [
      [999, 7],
      [50000, 23],
      [1, 1],
      [77, 6],
    ] as const) {
      const quote = dividiSpesa(totale, n);
      expect(quote).toHaveLength(n);
      expect(quote.reduce((s, q) => s + q, 0)).toBe(totale);
    }
  });
  test("totale più piccolo dei partecipanti: errore (quote da 0 vietate)", () => {
    expect(() => dividiSpesa(2, 3)).toThrow();
  });
  test("input non validi: errore", () => {
    expect(() => dividiSpesa(100, 0)).toThrow();
    expect(() => dividiSpesa(100.5, 2)).toThrow();
    expect(() => dividiSpesa(-100, 2)).toThrow();
  });
});
