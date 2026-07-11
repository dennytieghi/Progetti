import { describe, expect, it as test } from "vitest";
import { formatCassaReminderForWhatsapp } from "./format-message";

describe("formatCassaReminderForWhatsapp", () => {
  test("senza coordinate: solo invito e link", () => {
    const msg = formatCassaReminderForWhatsapp({
      classCode: "ABC123",
      baseUrl: "https://classehub.app",
      coords: null,
    });
    expect(msg).toContain("https://classehub.app/c/ABC123/cassa");
    expect(msg).not.toContain("IBAN");
  });
  test("con coordinate: elenca solo quelle compilate", () => {
    const msg = formatCassaReminderForWhatsapp({
      classCode: "ABC123",
      baseUrl: "https://classehub.app",
      coords: {
        iban: "IT60X0542811101000000123456",
        ibanHolder: "Denise Fabbri",
        paypal: null,
        satispay: "+393331234567",
      },
    });
    expect(msg).toContain("IT60X0542811101000000123456");
    expect(msg).toContain("Denise Fabbri");
    expect(msg).toContain("+393331234567");
    expect(msg).not.toContain("paypal.me");
  });
});
