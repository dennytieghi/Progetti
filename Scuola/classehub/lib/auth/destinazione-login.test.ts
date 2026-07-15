import { describe, expect, it as test } from "vitest";
import { destinazionePostLogin } from "./destinazione-login";

describe("destinazionePostLogin", () => {
  test("nessuna membership attiva → benvenuto", () => {
    expect(destinazionePostLogin([])).toBe("/benvenuto");
    expect(
      destinazionePostLogin([{ status: "pending", classCode: "AAAAAA" }])
    ).toBe("/benvenuto");
    expect(
      destinazionePostLogin([
        { status: "rejected", classCode: "AAAAAA" },
        { status: "removed", classCode: "BBBBBB" },
      ])
    ).toBe("/benvenuto");
  });
  test("una sola attiva → dritto in bacheca", () => {
    expect(
      destinazionePostLogin([
        { status: "active", classCode: "TEST5B" },
        { status: "pending", classCode: "CCCCCC" },
      ])
    ).toBe("/c/TEST5B");
  });
  test("due o più attive → le mie classi", () => {
    expect(
      destinazionePostLogin([
        { status: "active", classCode: "AAAAAA" },
        { status: "active", classCode: "BBBBBB" },
      ])
    ).toBe("/classi");
  });
});
