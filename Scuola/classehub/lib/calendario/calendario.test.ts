import { describe, expect, it as test } from "vitest";
import {
  aggiungiGiorni,
  dataValida,
  giornoDelPost,
  giornoItaliano,
  grigliaMese,
  raggruppaPerGiorno,
  settimanaDi,
  spostaMese,
  tipoDominante,
} from "./calendario";
import type { PostRow } from "@/lib/db/types";

function post(p: Partial<PostRow>): PostRow {
  return {
    id: "x", class_id: "c", author_id: "a", type: "notice", slug: "s",
    title: "t", body: null, due_date: null, pinned: false, archived: false,
    photo_path: null, created_at: "2026-07-09T10:00:00+00:00", edited_at: null,
    ...p,
  } as PostRow;
}

describe("giornoItaliano", () => {
  test("converte al fuso italiano (estate: UTC+2)", () => {
    // 21:30 UTC del 9 luglio = 23:30 italiane del 9 luglio
    expect(giornoItaliano("2026-07-09T21:30:00+00:00")).toBe("2026-07-09");
    // 22:30 UTC del 9 luglio = 00:30 italiane del 10 luglio
    expect(giornoItaliano("2026-07-09T22:30:00+00:00")).toBe("2026-07-10");
  });
});

describe("giornoDelPost", () => {
  test("scadenza sul giorno di scadenza", () => {
    const p = post({ type: "deadline", due_date: "2026-07-20T00:00:00+00:00" });
    expect(giornoDelPost(p)).toBe("2026-07-20");
  });
  test("gli altri sul giorno di pubblicazione (fuso italiano)", () => {
    expect(giornoDelPost(post({ created_at: "2026-07-09T22:30:00+00:00" }))).toBe(
      "2026-07-10"
    );
  });
});

describe("tipoDominante", () => {
  test("priorità scadenza > avviso > sondaggio > materiale", () => {
    expect(tipoDominante(["material", "poll", "notice", "deadline"])).toBe("deadline");
    expect(tipoDominante(["material", "poll", "notice"])).toBe("notice");
    expect(tipoDominante(["material", "poll"])).toBe("poll");
    expect(tipoDominante(["material"])).toBe("material");
    expect(tipoDominante([])).toBeNull();
  });
});

describe("raggruppaPerGiorno", () => {
  test("raggruppa per giorno calcolato", () => {
    const a = post({ id: "a", created_at: "2026-07-09T10:00:00+00:00" });
    const b = post({ id: "b", type: "deadline", due_date: "2026-07-09T00:00:00+00:00" });
    const c = post({ id: "c", created_at: "2026-07-10T10:00:00+00:00" });
    const m = raggruppaPerGiorno([a, b, c]);
    expect(m.get("2026-07-09")?.map((p) => p.id)).toEqual(["a", "b"]);
    expect(m.get("2026-07-10")?.map((p) => p.id)).toEqual(["c"]);
  });
});

describe("grigliaMese", () => {
  test("luglio 2026: inizia lunedì 29 giugno, finisce domenica 2 agosto", () => {
    const g = grigliaMese(2026, 7);
    expect(g[0]![0]).toEqual({ data: "2026-06-29", nelMese: false });
    expect(g[0]![2]).toEqual({ data: "2026-07-01", nelMese: true });
    const ultima = g[g.length - 1]!;
    expect(ultima[6]).toEqual({ data: "2026-08-02", nelMese: false });
    for (const settimana of g) expect(settimana).toHaveLength(7);
  });
});

describe("settimanaDi", () => {
  test("da un giovedì torna lun→dom", () => {
    expect(settimanaDi("2026-07-09")).toEqual([
      "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09",
      "2026-07-10", "2026-07-11", "2026-07-12",
    ]);
  });
  test("a cavallo di due mesi", () => {
    expect(settimanaDi("2026-08-01")[0]).toBe("2026-07-27");
  });
});

describe("aggiungiGiorni e spostaMese", () => {
  test("aggiungiGiorni scavalca il mese", () => {
    expect(aggiungiGiorni("2026-07-31", 1)).toBe("2026-08-01");
    expect(aggiungiGiorni("2026-07-01", -1)).toBe("2026-06-30");
  });
  test("spostaMese clampa a fine mese", () => {
    expect(spostaMese("2026-07-31", -1)).toBe("2026-06-30");
    expect(spostaMese("2026-07-15", 1)).toBe("2026-08-15");
  });
});

describe("dataValida", () => {
  test("accetta solo YYYY-MM-DD reali", () => {
    expect(dataValida("2026-07-09")).toBe(true);
    expect(dataValida("2026-02-30")).toBe(false);
    expect(dataValida("ciao")).toBe(false);
    expect(dataValida(undefined)).toBe(false);
  });
});
