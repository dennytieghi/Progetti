import { requireActiveMembership } from "@/lib/auth/require-membership";
import { listActiveMembers, listCashMovementsWithShares } from "@/lib/db/queries";
import { centsToEuroText } from "@/lib/euro";
import { it } from "@/lib/i18n/it";

/**
 * Scarica i movimenti della cassa come CSV (si apre con Excel e
 * Google Fogli). Una riga per OGNI quota, così i conti si rifanno
 * anche fuori dall'app.
 *
 * La RLS decide il contenuto senza codice in più: il rappresentante
 * riceve tutte le quote, il genitore SOLO le proprie — lo stesso
 * filtro della pagina Cassa.
 *
 * Formato per l'Excel italiano: separatore ";", decimali con la
 * virgola, BOM UTF-8 per le lettere accentate.
 */

function csvField(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classCode: string }> }
) {
  const { classCode } = await params;
  const ctx = await requireActiveMembership(classCode);

  let [items, members] = await Promise.all([
    listCashMovementsWithShares(ctx.klass.id),
    listActiveMembers(ctx.klass.id),
  ]);

  // Stessi filtri della pagina Cassa: il file contiene quello che vedi.
  const query = new URL(request.url).searchParams;
  const tipo = query.get("tipo");
  const kindFiltro =
    tipo === "versamenti" ? "deposit" : tipo === "spese" ? "expense" : null;
  if (kindFiltro) items = items.filter((i) => i.movement.kind === kindFiltro);
  const genitore = query.get("genitore");
  if (ctx.isRepresentative && genitore) {
    // Solo le righe di QUEL genitore: il file risponde a "quanto ha
    // versato e speso Anna", non "chi altro era alla gita con lei".
    items = items
      .map((i) => ({
        movement: i.movement,
        shares: i.shares.filter((s) => s.user_id === genitore),
      }))
      .filter((i) => i.shares.length > 0);
  }
  const nomi = new Map(
    members.map((m) => [m.membership.user_id, m.profile?.display_name ?? m.email ?? "?"])
  );

  const righe: string[] = [
    [
      it.cassa.csvData,
      it.cassa.csvTipo,
      it.cassa.csvCausale,
      it.cassa.csvGenitore,
      it.cassa.csvQuota,
      it.cassa.csvTotale,
      it.cassa.csvOrigine,
    ].join(";"),
  ];

  for (const { movement, shares } of items) {
    const segno = movement.kind === "deposit" ? 1 : -1;
    for (const share of shares) {
      righe.push(
        [
          new Intl.DateTimeFormat("it-IT").format(new Date(movement.created_at)),
          movement.kind === "deposit" ? it.cassa.versamento : it.cassa.spesa,
          csvField(movement.title),
          csvField(nomi.get(share.user_id) ?? "—"),
          centsToEuroText(segno * share.amount_cents),
          centsToEuroText(segno * movement.total_cents),
          movement.source === "stripe" ? it.cassa.csvCarta : it.cassa.csvContanti,
        ].join(";")
      );
    }
  }

  // \uFEFF = BOM: senza, l'Excel italiano storpia le lettere accentate.
  const csv = "\uFEFF" + righe.join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cassa-${ctx.klass.class_code}.csv"`,
    },
  });
}
