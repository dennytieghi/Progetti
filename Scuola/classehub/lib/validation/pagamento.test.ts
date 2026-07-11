import { describe, expect, it } from "vitest";
import { normalizzaIban, normalizzaLinkPaypal, normalizzaTelefono } from "./pagamento";

describe("normalizzaIban", () => {
  it("accetta un IBAN italiano con spazi e minuscole", () => {
    expect(normalizzaIban("it60 x054 2811 1010 0000 0123 456")).toBe(
      "IT60X0542811101000000123456"
    );
  });
  it("rifiuta IBAN esteri, corti o con caratteri strani", () => {
    expect(normalizzaIban("DE89370400440532013000")).toBeNull();
    expect(normalizzaIban("IT60X05428111010000001234")).toBeNull();
    expect(normalizzaIban("IT60X05428111010000001234!!")).toBeNull();
    expect(normalizzaIban("")).toBeNull();
  });
});

describe("normalizzaLinkPaypal", () => {
  it("porta ogni variante alla forma canonica", () => {
    expect(normalizzaLinkPaypal("paypal.me/denise")).toBe("https://paypal.me/denise");
    expect(normalizzaLinkPaypal("https://www.paypal.me/denise/")).toBe(
      "https://paypal.me/denise"
    );
  });
  it("rifiuta link che non sono paypal.me", () => {
    expect(normalizzaLinkPaypal("https://evil.com/paypal.me/denise")).toBeNull();
    expect(normalizzaLinkPaypal("paypal.com/denise")).toBeNull();
    expect(normalizzaLinkPaypal("denise")).toBeNull();
  });
});

describe("normalizzaTelefono", () => {
  it("accetta cellulari italiani con o senza prefisso e spazi", () => {
    expect(normalizzaTelefono("333 123 4567")).toBe("+393331234567");
    expect(normalizzaTelefono("+39 333 1234567")).toBe("+393331234567");
  });
  it("rifiuta numeri non cellulari o troppo corti", () => {
    expect(normalizzaTelefono("0511234567")).toBeNull();
    expect(normalizzaTelefono("333123")).toBeNull();
  });
});
