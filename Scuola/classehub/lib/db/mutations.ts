import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  generateClassCode,
  generateEmergencyCode,
  generatePostSlug,
  hashEmergencyCode,
} from "@/lib/codes/generate";
import { mutateDb, newId, nowIso } from "./store";
import type {
  AuthUserRow,
  ClassRow,
  MagicLinkRow,
  MembershipRow,
  PostRow,
  PostType,
  RequestRow,
} from "./types";

/** Helper di scrittura. In produzione: stesse firme, dentro Supabase. */

// ---------------------------------------------------------------- auth/profili

export function upsertAuthUser(email: string): AuthUserRow {
  const normalized = email.trim().toLowerCase();
  return mutateDb((db) => {
    const existing = db.auth_users.find((u) => u.email === normalized);
    if (existing) return existing;
    const user: AuthUserRow = { id: newId(), email: normalized, created_at: nowIso() };
    db.auth_users.push(user);
    return user;
  });
}

export function upsertProfile(userId: string, displayName: string): void {
  mutateDb((db) => {
    const existing = db.profiles.find((p) => p.user_id === userId);
    if (existing) {
      existing.display_name = displayName;
    } else {
      db.profiles.push({
        user_id: userId,
        display_name: displayName,
        created_at: nowIso(),
      });
    }
  });
}

// ---------------------------------------------------------------- classi

/**
 * Crea classe + membership del rappresentante (subito active).
 * Ritorna anche il codice di emergenza IN CHIARO: va mostrato una sola
 * volta e mai più (in salvataggio c'è solo l'hash).
 */
export function createClassWithRepresentative(input: {
  className: string;
  representativeUserId: string;
}): { klass: ClassRow; emergencyCode: string } {
  return mutateDb((db) => {
    // Il codice classe deve essere unico: riprova finché non lo è
    // (con 6 char su alfabeto da 31 la collisione è rarissima).
    let classCode = generateClassCode();
    while (db.classes.some((c) => c.class_code === classCode)) {
      classCode = generateClassCode();
    }

    const emergencyCode = generateEmergencyCode();
    const klass: ClassRow = {
      id: newId(),
      class_code: classCode,
      name: input.className,
      emergency_code_hash: hashEmergencyCode(emergencyCode),
      created_at: nowIso(),
      archived_at: null,
    };
    db.classes.push(klass);

    db.memberships.push({
      id: newId(),
      user_id: input.representativeUserId,
      class_id: klass.id,
      role: "representative",
      status: "active",
      note_for_rep: null,
      rejection_reason: null,
      muted: false,
      joined_at: nowIso(),
      decided_at: nowIso(),
      decided_by: input.representativeUserId,
      ended_at: null,
    });

    return { klass, emergencyCode };
  });
}

// ---------------------------------------------------------------- membership

/** Richiesta di iscrizione del genitore: nasce sempre 'pending' (ADR-001). */
export function createPendingMembership(input: {
  userId: string;
  classId: string;
  noteForRep: string | null;
}): MembershipRow {
  return mutateDb((db) => {
    const existing = db.memberships.find(
      (m) => m.user_id === input.userId && m.class_id === input.classId
    );
    if (existing) {
      // Se era stato rifiutato o rimosso può riprovare: torna pending.
      if (existing.status === "rejected" || existing.status === "removed") {
        existing.status = "pending";
        existing.note_for_rep = input.noteForRep;
        existing.rejection_reason = null;
        existing.joined_at = nowIso();
        existing.decided_at = null;
        existing.decided_by = null;
        existing.ended_at = null;
      }
      return existing;
    }
    const membership: MembershipRow = {
      id: newId(),
      user_id: input.userId,
      class_id: input.classId,
      role: "parent",
      status: "pending",
      note_for_rep: input.noteForRep,
      rejection_reason: null,
      muted: false,
      joined_at: nowIso(),
      decided_at: null,
      decided_by: null,
      ended_at: null,
    };
    db.memberships.push(membership);
    return membership;
  });
}

/** Approvazione: status active, nota azzerata (PROJECT_SPEC §Onboarding). */
export function approveMembership(membershipId: string, deciderId: string): void {
  mutateDb((db) => {
    const m = db.memberships.find((x) => x.id === membershipId);
    if (!m || m.status !== "pending") return;
    m.status = "active";
    m.decided_at = nowIso();
    m.decided_by = deciderId;
    m.note_for_rep = null;
  });
}

export function rejectMembership(
  membershipId: string,
  deciderId: string,
  reason: string | null
): void {
  mutateDb((db) => {
    const m = db.memberships.find((x) => x.id === membershipId);
    if (!m || m.status !== "pending") return;
    m.status = "rejected";
    m.decided_at = nowIso();
    m.decided_by = deciderId;
    m.rejection_reason = reason;
    m.note_for_rep = null;
  });
}

/** Rimozione soft (status 'removed'), mai cancellazione fisica. */
export function removeMembership(membershipId: string, deciderId: string): void {
  mutateDb((db) => {
    const m = db.memberships.find((x) => x.id === membershipId);
    if (!m || m.status !== "active" || m.role === "representative") return;
    m.status = "removed";
    m.ended_at = nowIso();
    m.decided_by = deciderId;
  });
}

export function setMuted(membershipId: string, muted: boolean): void {
  mutateDb((db) => {
    const m = db.memberships.find((x) => x.id === membershipId);
    if (!m || m.status !== "active" || m.role === "representative") return;
    m.muted = muted;
  });
}

// ---------------------------------------------------------------- post

export function createPost(input: {
  classId: string;
  authorId: string;
  type: PostType;
  title: string;
  body: string | null;
  dueDate: string | null;
  photoPath: string | null;
  /** Solo per type='poll'. */
  poll?: { closesAt: string; options: string[] };
}): PostRow {
  return mutateDb((db) => {
    // Slug unico dentro la classe (URL corti per WhatsApp).
    let slug = generatePostSlug();
    while (db.posts.some((p) => p.class_id === input.classId && p.slug === slug)) {
      slug = generatePostSlug();
    }

    const post: PostRow = {
      id: newId(),
      class_id: input.classId,
      author_id: input.authorId,
      type: input.type,
      slug,
      title: input.title,
      body: input.body,
      due_date: input.dueDate,
      pinned: false,
      archived: false,
      photo_path: input.photoPath,
      created_at: nowIso(),
    };
    db.posts.push(post);

    if (input.type === "poll" && input.poll) {
      db.polls.push({
        post_id: post.id,
        closes_at: input.poll.closesAt,
        closed_manually: false,
        salt: randomBytes(16).toString("hex"),
      });
      input.poll.options.forEach((label, ord) => {
        db.poll_options.push({ id: newId(), post_id: post.id, label, ord });
      });
    }

    return post;
  });
}

export function setPinned(postId: string, pinned: boolean): void {
  mutateDb((db) => {
    const p = db.posts.find((x) => x.id === postId);
    if (p) p.pinned = pinned;
  });
}

export function setArchived(postId: string, archived: boolean): void {
  mutateDb((db) => {
    const p = db.posts.find((x) => x.id === postId);
    if (p) {
      p.archived = archived;
      if (archived) p.pinned = false;
    }
  });
}

// ---------------------------------------------------------------- sondaggi

/** Hash anonimo del votante (ADR-003): hash(user_id + salt del sondaggio). */
export function computeVoterHash(userId: string, pollSalt: string): string {
  return createHash("sha256").update(`${userId}:${pollSalt}`).digest("hex");
}

/**
 * Registra il voto (una riga per opzione scelta).
 * Ritorna false se l'utente aveva già votato o il sondaggio è chiuso.
 */
export function castVote(input: {
  postId: string;
  optionIds: string[];
  voterHash: string;
}): boolean {
  return mutateDb((db) => {
    const poll = db.polls.find((p) => p.post_id === input.postId);
    if (!poll) return false;
    if (poll.closed_manually || new Date(poll.closes_at) <= new Date()) return false;
    const already = db.poll_votes.some(
      (v) => v.post_id === input.postId && v.voter_hash === input.voterHash
    );
    if (already) return false;

    const validOptionIds = new Set(
      db.poll_options.filter((o) => o.post_id === input.postId).map((o) => o.id)
    );
    const chosen = input.optionIds.filter((id) => validOptionIds.has(id));
    if (chosen.length === 0) return false;

    for (const optionId of chosen) {
      db.poll_votes.push({
        post_id: input.postId,
        option_id: optionId,
        voter_hash: input.voterHash,
        voted_at: nowIso(),
      });
    }
    return true;
  });
}

export function closePoll(postId: string): void {
  mutateDb((db) => {
    const poll = db.polls.find((p) => p.post_id === postId);
    if (poll) poll.closed_manually = true;
  });
}

// ---------------------------------------------------------------- richieste

export function createRequest(input: {
  classId: string;
  authorId: string;
  body: string;
}): RequestRow {
  return mutateDb((db) => {
    const request: RequestRow = {
      id: newId(),
      class_id: input.classId,
      author_id: input.authorId,
      body: input.body,
      status: "open",
      converted_to_post_id: null,
      created_at: nowIso(),
    };
    db.requests.push(request);
    return request;
  });
}

export function setRequestStatus(
  requestId: string,
  status: "handled" | "archived",
  convertedToPostId: string | null = null
): void {
  mutateDb((db) => {
    const r = db.requests.find((x) => x.id === requestId);
    if (!r) return;
    r.status = status;
    if (convertedToPostId) r.converted_to_post_id = convertedToPostId;
  });
}

// ---------------------------------------------------------------- magic link (solo PoC)

export function createMagicLink(input: {
  email: string;
  displayName: string;
  payload: MagicLinkRow["payload"];
}): MagicLinkRow {
  return mutateDb((db) => {
    const link: MagicLinkRow = {
      token: randomBytes(24).toString("hex"),
      email: input.email.trim().toLowerCase(),
      display_name: input.displayName,
      payload: input.payload,
      created_at: nowIso(),
      used_at: null,
    };
    db.magic_links.push(link);
    return link;
  });
}

/** Consuma il token: valido una sola volta e per 24 ore. */
export function consumeMagicLink(token: string): MagicLinkRow | null {
  return mutateDb((db) => {
    const link = db.magic_links.find((l) => l.token === token);
    if (!link || link.used_at) return null;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (new Date(link.created_at).getTime() < dayAgo) return null;
    link.used_at = nowIso();
    return link;
  });
}

// ---------------------------------------------------------------- segreti one-time

export function createOneTimeSecret(classId: string, emergencyCode: string): string {
  return mutateDb((db) => {
    const id = randomBytes(16).toString("hex");
    db.one_time_secrets.push({
      id,
      class_id: classId,
      emergency_code: emergencyCode,
      consumed_at: null,
    });
    return id;
  });
}

/** Ritorna il codice di emergenza UNA sola volta, poi lo cancella. */
export function consumeOneTimeSecret(secretId: string, classId: string): string | null {
  return mutateDb((db) => {
    const secret = db.one_time_secrets.find(
      (s) => s.id === secretId && s.class_id === classId
    );
    if (!secret || secret.consumed_at) return null;
    secret.consumed_at = nowIso();
    const code = secret.emergency_code;
    secret.emergency_code = ""; // il codice in chiaro non resta su disco
    return code;
  });
}
