/**
 * Tipi delle righe del database. Rispecchiano 1:1 lo schema SQL in
 * supabase/migrations/0001_init.sql. In produzione questo file viene
 * sostituito da types.gen.ts generato con `supabase gen types`.
 */

export type Role = "representative" | "parent";
export type MembershipStatus = "pending" | "active" | "rejected" | "removed";
export type PostType = "notice" | "deadline" | "poll" | "material";
export type RequestStatus = "open" | "handled" | "archived";

export interface ClassRow {
  id: string;
  class_code: string;
  name: string;
  emergency_code_hash: string;
  created_at: string;
  archived_at: string | null;
}

export interface ProfileRow {
  user_id: string;
  display_name: string;
  created_at: string;
}

export interface MembershipRow {
  id: string;
  user_id: string;
  class_id: string;
  role: Role;
  status: MembershipStatus;
  note_for_rep: string | null;
  rejection_reason: string | null;
  muted: boolean;
  joined_at: string;
  decided_at: string | null;
  decided_by: string | null;
  ended_at: string | null;
}

export interface PostRow {
  id: string;
  class_id: string;
  author_id: string;
  type: PostType;
  slug: string;
  title: string;
  body: string | null;
  due_date: string | null;
  pinned: boolean;
  archived: boolean;
  photo_path: string | null;
  created_at: string;
}

export interface PollRow {
  post_id: string;
  closes_at: string;
  closed_manually: boolean;
  /** Salt per l'hash anonimo dei votanti (ADR-003). */
  salt: string;
}

export interface PollOptionRow {
  id: string;
  post_id: string;
  label: string;
  ord: number;
}

export interface PollVoteRow {
  post_id: string;
  option_id: string;
  voter_hash: string;
  voted_at: string;
}

export interface RequestRow {
  id: string;
  class_id: string;
  author_id: string;
  body: string;
  status: RequestStatus;
  converted_to_post_id: string | null;
  created_at: string;
}

/**
 * Segreti mostrati una volta sola (codice di emergenza dopo la
 * creazione classe). Consumati alla prima visualizzazione.
 * Tabella con RLS senza policy: ci passa solo il server.
 */
export interface OneTimeSecretRow {
  id: string;
  class_id: string;
  emergency_code: string;
  consumed_at: string | null;
}
