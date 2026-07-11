import { describe, expect, it as test } from "vitest";
import { dividiPerSaldo } from "./debitori";

const membri = [
  { userId: "a", name: "Anna" },
  { userId: "b", name: "Bruno" },
  { userId: "c", name: "Carla" },
  { userId: "d", name: "Dario" },
];

describe("dividiPerSaldo", () => {
  test("separa debitori e a-posto; chi non ha movimenti ha saldo 0", () => {
    const saldi = new Map([["a", -350], ["b", 1200], ["c", -1000]]);
    const r = dividiPerSaldo(membri, saldi);
    expect(r.debitori.map((m) => m.userId)).toEqual(["c", "a"]); // debito più grande prima
    expect(r.aPosto.map((m) => m.userId)).toEqual(["b", "d"]);   // per nome, incluso Dario (0)
    expect(r.aPosto.find((m) => m.userId === "d")?.cents).toBe(0);
    expect(r.totaleDovutoCents).toBe(1350);
  });
  test("nessun debitore: lista vuota e totale 0", () => {
    const r = dividiPerSaldo(membri, new Map([["a", 500]]));
    expect(r.debitori).toEqual([]);
    expect(r.totaleDovutoCents).toBe(0);
    expect(r.aPosto).toHaveLength(4);
  });
});
