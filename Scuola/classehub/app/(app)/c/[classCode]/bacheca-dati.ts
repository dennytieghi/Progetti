// app/(app)/c/[classCode]/bacheca-dati.ts
import "server-only";
import {
  getPoll,
  hasVoted,
  isPollClosed,
  listMyReadPostIds,
  listPosts,
  listUpcomingDeadlines,
} from "@/lib/db/queries";
import type { ClassContext } from "@/lib/auth/require-membership";
import type { PostRow } from "@/lib/db/types";

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000;

export interface DatiBacheca {
  allPosts: PostRow[];
  attivi: PostRow[];
  evidenzaPosts: PostRow[];
  nuoviPosts: PostRow[];
  deadlines: PostRow[];
  sondaggiAperti: PostRow[];
}

/**
 * Dati e statistiche condivisi tra bacheca e calendario. Statistiche
 * PERSONALI: "nuovo" = ultimi 7 giorni non visti da me; "sondaggi
 * aperti" = dove non ho ancora votato (il voto vale come visto e
 * resta anonimo — ADR-003).
 */
export async function caricaDatiBacheca(
  ctx: ClassContext,
  opts: { includeArchived: boolean }
): Promise<DatiBacheca> {
  const deadlines = await listUpcomingDeadlines(ctx.klass.id);
  const allPosts = await listPosts(ctx.klass.id, {
    includeArchived: opts.includeArchived,
  });
  const attivi = allPosts.filter((p) => !p.archived);
  const evidenzaPosts = attivi.filter((p) => p.pinned);
  const sogliaNuovi = Date.now() - SETTE_GIORNI_MS;
  const nuoviCandidati = attivi.filter(
    (p) => p.type === "notice" && new Date(p.created_at).getTime() >= sogliaNuovi
  );
  const vistiMiei = await listMyReadPostIds(
    ctx.user.id,
    nuoviCandidati.map((p) => p.id)
  );
  const nuoviPosts = nuoviCandidati.filter((p) => !vistiMiei.has(p.id));
  const pollPosts = attivi.filter((p) => p.type === "poll");
  const pollDettagli = await Promise.all(pollPosts.map((p) => getPoll(p.id)));
  const apertiTutti = pollPosts.filter((_, i) => {
    const poll = pollDettagli[i];
    return poll !== null && poll !== undefined && !isPollClosed(poll);
  });
  const hoVotato = await Promise.all(apertiTutti.map((p) => hasVoted(p.id)));
  const sondaggiAperti = apertiTutti.filter((_, i) => !hoVotato[i]);

  return { allPosts, attivi, evidenzaPosts, nuoviPosts, deadlines, sondaggiAperti };
}
