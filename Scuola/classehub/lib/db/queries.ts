import "server-only";
import { supabaseAdmin, supabaseServer } from "./supabase";
import type {
  CashDeclarationRow,
  CashMovementRow,
  CashShareRow,
  ClassRow,
  MembershipRow,
  PollOptionRow,
  PollRow,
  PollVoteRow,
  PostRow,
  ProfileRow,
  RequestRow,
} from "./types";
import type { MovimentoConQuote } from "@/lib/cassa/saldi";

/**
 * Helper di sola lettura su Supabase.
 * Default: client utente (la RLS decide cosa può vedere).
 * Client admin SOLO dove la RLS non può arrivare, con motivo a fianco.
 */

/** Admin: serve prima del login (l'RLS nasconde le classi ai non membri). */
export async function getClassByCode(classCode: string): Promise<ClassRow | null> {
  const { data } = await supabaseAdmin()
    .from("classes")
    .select("*")
    .eq("class_code", classCode)
    .is("archived_at", null)
    .maybeSingle();
  return (data as ClassRow | null) ?? null;
}

/** Admin: usato nel callback, quando la membership non esiste ancora. */
export async function getClassById(classId: string): Promise<ClassRow | null> {
  const { data } = await supabaseAdmin()
    .from("classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle();
  return (data as ClassRow | null) ?? null;
}

/** Admin: le email vivono in auth.users, che i client non leggono. */
export async function getUserEmailById(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

export async function getMembership(
  userId: string,
  classId: string
): Promise<MembershipRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("class_id", classId)
    .maybeSingle();
  return (data as MembershipRow | null) ?? null;
}

export async function getMembershipById(
  membershipId: string
): Promise<MembershipRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("memberships")
    .select("*")
    .eq("id", membershipId)
    .maybeSingle();
  return (data as MembershipRow | null) ?? null;
}

/**
 * Le classi di un utente (pagina account). Le classi delle membership
 * pending sono nascoste dall'RLS, quindi i nomi si leggono con l'admin.
 */
export async function listClassesForUser(
  userId: string
): Promise<Array<{ membership: MembershipRow; klass: ClassRow }>> {
  const supabase = await supabaseServer();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "pending"]);
  if (!memberships || memberships.length === 0) return [];

  const classIds = memberships.map((m) => m.class_id);
  const { data: classes } = await supabaseAdmin()
    .from("classes")
    .select("*")
    .in("id", classIds);

  return (memberships as MembershipRow[])
    .map((membership) => {
      const klass = (classes as ClassRow[] | null)?.find(
        (c) => c.id === membership.class_id
      );
      return klass ? { membership, klass } : null;
    })
    .filter((x): x is { membership: MembershipRow; klass: ClassRow } => x !== null);
}

export interface MemberWithProfile {
  membership: MembershipRow;
  profile: ProfileRow | null;
  email: string | null;
}

/**
 * Aggancia profilo (RLS: i compagni di classe si vedono) ed email.
 * Le email vivono in auth.users, che i client non possono leggere:
 * si recuperano con l'admin — queste liste le vede solo chi è già
 * dentro la classe (la query memberships è passata dall'RLS).
 */
async function withProfiles(memberships: MembershipRow[]): Promise<MemberWithProfile[]> {
  if (memberships.length === 0) return [];
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const userIds = memberships.map((m) => m.user_id);

  const [{ data: profiles }, emails] = await Promise.all([
    supabase.from("profiles").select("*").in("user_id", userIds),
    Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        return { id, email: data.user?.email ?? null };
      })
    ),
  ]);

  return memberships.map((membership) => ({
    membership,
    profile:
      (profiles as ProfileRow[] | null)?.find(
        (p) => p.user_id === membership.user_id
      ) ?? null,
    email: emails.find((e) => e.id === membership.user_id)?.email ?? null,
  }));
}

/** Coda approvazioni: richieste pending, dalla più vecchia. */
export async function listPendingMemberships(
  classId: string
): Promise<MemberWithProfile[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("memberships")
    .select("*")
    .eq("class_id", classId)
    .eq("status", "pending")
    .order("joined_at", { ascending: true });
  return withProfiles((data as MembershipRow[] | null) ?? []);
}

/** Membri attivi della classe (rappresentante in cima). */
export async function listActiveMembers(classId: string): Promise<MemberWithProfile[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("memberships")
    .select("*")
    .eq("class_id", classId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  const members = ((data as MembershipRow[] | null) ?? []).sort((a, b) => {
    if (a.role !== b.role) return a.role === "representative" ? -1 : 1;
    return a.joined_at.localeCompare(b.joined_at);
  });
  return withProfiles(members);
}

export async function countPendingMemberships(classId: string): Promise<number> {
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("status", "pending");
  return count ?? 0;
}

/** Post della bacheca: fissati in cima, poi dal più recente. */
export async function listPosts(
  classId: string,
  opts: { includeArchived?: boolean } = {}
): Promise<PostRow[]> {
  const supabase = await supabaseServer();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("class_id", classId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (!opts.includeArchived) query = query.eq("archived", false);
  const { data } = await query;
  return (data as PostRow[] | null) ?? [];
}

/** Scadenze future non archiviate, dalla più vicina. */
export async function listUpcomingDeadlines(classId: string): Promise<PostRow[]> {
  const supabase = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("class_id", classId)
    .eq("type", "deadline")
    .eq("archived", false)
    .gte("due_date", today)
    .order("due_date", { ascending: true });
  return (data as PostRow[] | null) ?? [];
}

export async function getPostBySlug(
  classId: string,
  slug: string
): Promise<PostRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("class_id", classId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as PostRow | null) ?? null;
}

export async function getPostById(postId: string): Promise<PostRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  return (data as PostRow | null) ?? null;
}

/**
 * Il salt del sondaggio non lascia MAI il database (i permessi per
 * colonna lo bloccano, migrazione 0002): qui si leggono solo i campi
 * pubblici. Il tipo esposto quindi non contiene salt.
 */
export type PollPublic = Omit<PollRow, "salt">;

export async function getPoll(postId: string): Promise<PollPublic | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("polls")
    .select("post_id, closes_at, closed_manually")
    .eq("post_id", postId)
    .maybeSingle();
  return (data as PollPublic | null) ?? null;
}

export async function listPollOptions(postId: string): Promise<PollOptionRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("poll_options")
    .select("*")
    .eq("post_id", postId)
    .order("ord", { ascending: true });
  return (data as PollOptionRow[] | null) ?? [];
}

/**
 * Voti del sondaggio. L'RLS li mostra solo a chi ha già votato, a
 * sondaggio chiuso o al rappresentante: per gli altri torna vuoto.
 */
export async function listPollVotes(postId: string): Promise<PollVoteRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("poll_votes")
    .select("*")
    .eq("post_id", postId);
  return (data as PollVoteRow[] | null) ?? [];
}

/** "Ho già votato?" — calcolato nel DB (RPC), il salt non esce mai. */
export async function hasVoted(postId: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("has_voted", { target_post: postId });
  return data === true;
}

/** Un sondaggio è chiuso se scaduto o chiuso a mano. */
export function isPollClosed(poll: PollPublic): boolean {
  return poll.closed_manually || new Date(poll.closes_at) <= new Date();
}

/** Richieste della classe per il rappresentante, dalla più recente. */
export async function listRequests(classId: string): Promise<RequestRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  return (data as RequestRow[] | null) ?? [];
}

export async function listRequestsByAuthor(
  classId: string,
  authorId: string
): Promise<RequestRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("class_id", classId)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  return (data as RequestRow[] | null) ?? [];
}

export async function getRequestById(requestId: string): Promise<RequestRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  return (data as RequestRow | null) ?? null;
}

/**
 * Movimenti della cassa con le quote, dal più recente.
 * L'RLS fa da filtro naturale: il genitore riceve tutti i movimenti
 * della classe ma SOLO le proprie quote; il rappresentante riceve tutto.
 */
export async function listCashMovementsWithShares(
  classId: string
): Promise<MovimentoConQuote[]> {
  const supabase = await supabaseServer();
  const { data: movements } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  const rows = (movements as CashMovementRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const { data: shares } = await supabase
    .from("cash_shares")
    .select("*")
    .in("movement_id", rows.map((m) => m.id));
  const shareRows = (shares as CashShareRow[] | null) ?? [];

  return rows.map((movement) => ({
    movement,
    shares: shareRows.filter((s) => s.movement_id === movement.id),
  }));
}

export async function listCashSharesByMovement(
  movementId: string
): Promise<CashShareRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("cash_shares")
    .select("*")
    .eq("movement_id", movementId);
  return (data as CashShareRow[] | null) ?? [];
}

export async function getCashMovementById(
  movementId: string
): Promise<CashMovementRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("id", movementId)
    .maybeSingle();
  return (data as CashMovementRow | null) ?? null;
}

/** Dichiarazioni in attesa (il rappresentante le vede tutte via RLS). */
export async function listPendingDeclarations(
  classId: string
): Promise<CashDeclarationRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("cash_declarations")
    .select("*")
    .eq("class_id", classId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return (data as CashDeclarationRow[] | null) ?? [];
}

/**
 * Conta le dichiarazioni in attesa di conferma nella classe.
 * Da chiamare SOLO per il rappresentante: l'RLS mostra ai genitori solo
 * le proprie dichiarazioni, quindi per loro il conteggio sarebbe fuorviante.
 */
export async function countPendingDeclarations(classId: string): Promise<number> {
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("cash_declarations")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("status", "pending");
  return count ?? 0;
}

/** Le dichiarazioni del genitore: in attesa + rifiutate recenti. */
export async function listMyDeclarations(
  classId: string,
  userId: string
): Promise<CashDeclarationRow[]> {
  const supabase = await supabaseServer();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("cash_declarations")
    .select("*")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .or(`status.eq.pending,and(status.eq.rejected,created_at.gte.${monthAgo})`)
    .order("created_at", { ascending: false });
  return (data as CashDeclarationRow[] | null) ?? [];
}

export async function countPendingDeclarationsByUser(
  classId: string,
  userId: string
): Promise<number> {
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("cash_declarations")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("user_id", userId)
    .eq("status", "pending");
  return count ?? 0;
}

export async function getCashDeclarationById(
  id: string
): Promise<CashDeclarationRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("cash_declarations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as CashDeclarationRow | null) ?? null;
}

/**
 * Rate limit richieste (ARCHITECTURE §RATE LIMITING): conta open+handled
 * dell'autore nelle ultime 24 ore. Serve per il messaggio gentile;
 * il limite vero lo impone comunque l'RLS in inserimento.
 */
export async function countRecentRequests(
  classId: string,
  authorId: string
): Promise<number> {
  const supabase = await supabaseServer();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("author_id", authorId)
    .in("status", ["open", "handled"])
    .gte("created_at", dayAgo);
  return count ?? 0;
}
