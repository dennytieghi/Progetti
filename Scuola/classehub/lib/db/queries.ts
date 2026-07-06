import "server-only";
import { readDb } from "./store";
import type {
  AuthUserRow,
  ClassRow,
  MagicLinkRow,
  MembershipRow,
  PollOptionRow,
  PollRow,
  PollVoteRow,
  PostRow,
  ProfileRow,
  RequestRow,
} from "./types";

/** Helper di sola lettura. In produzione: stesse firme, dentro Supabase. */

export function getClassByCode(classCode: string): ClassRow | null {
  const db = readDb();
  return db.classes.find((c) => c.class_code === classCode && !c.archived_at) ?? null;
}

export function getClassById(classId: string): ClassRow | null {
  const db = readDb();
  return db.classes.find((c) => c.id === classId) ?? null;
}

export function getAuthUserByEmail(email: string): AuthUserRow | null {
  const db = readDb();
  const normalized = email.trim().toLowerCase();
  return db.auth_users.find((u) => u.email === normalized) ?? null;
}

export function getAuthUserById(userId: string): AuthUserRow | null {
  const db = readDb();
  return db.auth_users.find((u) => u.id === userId) ?? null;
}

export function getProfile(userId: string): ProfileRow | null {
  const db = readDb();
  return db.profiles.find((p) => p.user_id === userId) ?? null;
}

export function getMembership(userId: string, classId: string): MembershipRow | null {
  const db = readDb();
  return (
    db.memberships.find((m) => m.user_id === userId && m.class_id === classId) ?? null
  );
}

export function getMembershipById(membershipId: string): MembershipRow | null {
  const db = readDb();
  return db.memberships.find((m) => m.id === membershipId) ?? null;
}

/** Le classi di un utente (per la pagina account). */
export function listClassesForUser(
  userId: string
): Array<{ membership: MembershipRow; klass: ClassRow }> {
  const db = readDb();
  return db.memberships
    .filter((m) => m.user_id === userId && (m.status === "active" || m.status === "pending"))
    .map((membership) => {
      const klass = db.classes.find((c) => c.id === membership.class_id);
      return klass ? { membership, klass } : null;
    })
    .filter((x): x is { membership: MembershipRow; klass: ClassRow } => x !== null);
}

export interface MemberWithProfile {
  membership: MembershipRow;
  profile: ProfileRow | null;
  email: string | null;
}

function withProfile(membership: MembershipRow): MemberWithProfile {
  const db = readDb();
  return {
    membership,
    profile: db.profiles.find((p) => p.user_id === membership.user_id) ?? null,
    email: db.auth_users.find((u) => u.id === membership.user_id)?.email ?? null,
  };
}

/** Coda approvazioni: richieste pending, dalla più vecchia. */
export function listPendingMemberships(classId: string): MemberWithProfile[] {
  const db = readDb();
  return db.memberships
    .filter((m) => m.class_id === classId && m.status === "pending")
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    .map(withProfile);
}

/** Membri attivi della classe (rappresentante in cima). */
export function listActiveMembers(classId: string): MemberWithProfile[] {
  const db = readDb();
  return db.memberships
    .filter((m) => m.class_id === classId && m.status === "active")
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "representative" ? -1 : 1;
      return a.joined_at.localeCompare(b.joined_at);
    })
    .map(withProfile);
}

export function countPendingMemberships(classId: string): number {
  const db = readDb();
  return db.memberships.filter((m) => m.class_id === classId && m.status === "pending")
    .length;
}

/** Post della bacheca: fissati in cima, poi dal più recente. */
export function listPosts(
  classId: string,
  opts: { includeArchived?: boolean } = {}
): PostRow[] {
  const db = readDb();
  return db.posts
    .filter(
      (p) => p.class_id === classId && (opts.includeArchived ? true : !p.archived)
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    });
}

/** Scadenze future non archiviate, dalla più vicina. */
export function listUpcomingDeadlines(classId: string): PostRow[] {
  const db = readDb();
  const now = new Date().toISOString();
  return db.posts
    .filter(
      (p) =>
        p.class_id === classId &&
        !p.archived &&
        p.type === "deadline" &&
        p.due_date !== null &&
        p.due_date >= now.slice(0, 10)
    )
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
}

export function getPostBySlug(classId: string, slug: string): PostRow | null {
  const db = readDb();
  return db.posts.find((p) => p.class_id === classId && p.slug === slug) ?? null;
}

export function getPostById(postId: string): PostRow | null {
  const db = readDb();
  return db.posts.find((p) => p.id === postId) ?? null;
}

export function getPoll(postId: string): PollRow | null {
  const db = readDb();
  return db.polls.find((p) => p.post_id === postId) ?? null;
}

export function listPollOptions(postId: string): PollOptionRow[] {
  const db = readDb();
  return db.poll_options
    .filter((o) => o.post_id === postId)
    .sort((a, b) => a.ord - b.ord);
}

export function listPollVotes(postId: string): PollVoteRow[] {
  const db = readDb();
  return db.poll_votes.filter((v) => v.post_id === postId);
}

export function hasVoted(postId: string, voterHash: string): boolean {
  const db = readDb();
  return db.poll_votes.some((v) => v.post_id === postId && v.voter_hash === voterHash);
}

/** Un sondaggio è chiuso se scaduto o chiuso a mano. */
export function isPollClosed(poll: PollRow): boolean {
  return poll.closed_manually || new Date(poll.closes_at) <= new Date();
}

/** Richieste aperte per il rappresentante, dalla più recente. */
export function listRequests(classId: string): RequestRow[] {
  const db = readDb();
  return db.requests
    .filter((r) => r.class_id === classId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listRequestsByAuthor(classId: string, authorId: string): RequestRow[] {
  const db = readDb();
  return db.requests
    .filter((r) => r.class_id === classId && r.author_id === authorId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getRequestById(requestId: string): RequestRow | null {
  const db = readDb();
  return db.requests.find((r) => r.id === requestId) ?? null;
}

/**
 * Rate limit richieste (ARCHITECTURE §RATE LIMITING):
 * conta open+handled dell'autore nella classe nelle ultime 24 ore.
 */
export function countRecentRequests(classId: string, authorId: string): number {
  const db = readDb();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return db.requests.filter(
    (r) =>
      r.class_id === classId &&
      r.author_id === authorId &&
      (r.status === "open" || r.status === "handled") &&
      r.created_at >= dayAgo
  ).length;
}

export function getMagicLink(token: string): MagicLinkRow | null {
  const db = readDb();
  return db.magic_links.find((l) => l.token === token) ?? null;
}
