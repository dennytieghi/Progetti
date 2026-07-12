/**
 * Logica pura della vista calendario (spec 2026-07-12).
 * Tutte le date "giorno" sono stringhe YYYY-MM-DD; l'aritmetica usa
 * Date in UTC (mai il fuso del server) e la conversione al fuso
 * italiano avviene SOLO in giornoItaliano.
 */
import type { PostRow, PostType } from "@/lib/db/types";

export interface CellaGiorno {
  data: string;
  nelMese: boolean;
}

const FORMATO_ROMA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Timestamp ISO → YYYY-MM-DD nel fuso italiano ("en-CA" formatta così). */
export function giornoItaliano(isoTimestamp: string): string {
  return FORMATO_ROMA.format(new Date(isoTimestamp));
}

/** Scadenze sul giorno di scadenza; il resto sul giorno di pubblicazione. */
export function giornoDelPost(
  post: Pick<PostRow, "type" | "created_at" | "due_date">
): string {
  if (post.type === "deadline" && post.due_date) {
    // La due_date nasce da un input date (mezzanotte UTC): il giorno è
    // nei primi 10 caratteri, stessa convenzione di formatDateIt.
    return post.due_date.slice(0, 10);
  }
  return giornoItaliano(post.created_at);
}

export function raggruppaPerGiorno(posts: PostRow[]): Map<string, PostRow[]> {
  const mappa = new Map<string, PostRow[]>();
  for (const post of posts) {
    const giorno = giornoDelPost(post);
    const lista = mappa.get(giorno);
    if (lista) lista.push(post);
    else mappa.set(giorno, [post]);
  }
  return mappa;
}

const PRIORITA: PostType[] = ["deadline", "notice", "poll", "material"];

export function tipoDominante(tipi: PostType[]): PostType | null {
  for (const tipo of PRIORITA) if (tipi.includes(tipo)) return tipo;
  return null;
}

function daYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

function aYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function aggiungiGiorni(dataYmd: string, n: number): string {
  const d = daYmd(dataYmd);
  d.setUTCDate(d.getUTCDate() + n);
  return aYmd(d);
}

/** Stesso giorno del mese ±delta, clampato all'ultimo giorno del mese. */
export function spostaMese(dataYmd: string, delta: number): string {
  const d = daYmd(dataYmd);
  const giorno = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + delta);
  const ultimoGiorno = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(giorno, ultimoGiorno));
  return aYmd(d);
}

/** Lunedì della settimana di dataYmd (getUTCDay: 0=domenica). */
function lunediDi(dataYmd: string): string {
  const d = daYmd(dataYmd);
  const scarto = (d.getUTCDay() + 6) % 7;
  return aggiungiGiorni(dataYmd, -scarto);
}

export function settimanaDi(dataYmd: string): string[] {
  const lunedi = lunediDi(dataYmd);
  return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lunedi, i));
}

/** Settimane complete lun→dom che coprono il mese (mese 1-12). */
export function grigliaMese(anno: number, mese: number): CellaGiorno[][] {
  const primo = `${anno}-${String(mese).padStart(2, "0")}-01`;
  const prefisso = primo.slice(0, 7);
  const settimane: CellaGiorno[][] = [];
  let cursore = lunediDi(primo);
  do {
    settimane.push(
      Array.from({ length: 7 }, (_, i) => {
        const data = aggiungiGiorni(cursore, i);
        return { data, nelMese: data.startsWith(prefisso) };
      })
    );
    cursore = aggiungiGiorni(cursore, 7);
  } while (cursore.startsWith(prefisso));
  return settimane;
}

export function dataValida(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return aYmd(daYmd(s)) === s;
}
