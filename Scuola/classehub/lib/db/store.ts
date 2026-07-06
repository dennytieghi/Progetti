import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type {
  AuthUserRow,
  ClassRow,
  MagicLinkRow,
  MembershipRow,
  OneTimeSecretRow,
  OutboxEmailRow,
  PollOptionRow,
  PollRow,
  PollVoteRow,
  PostRow,
  ProfileRow,
  RequestRow,
} from "./types";

/**
 * Store locale su file JSON — SOLO per il PoC.
 * In produzione l'intero accesso ai dati passa dal client Supabase
 * (con RLS attiva, vedi supabase/migrations/0001_init.sql): le uniche
 * funzioni da riscrivere sono quelle in queries.ts e mutations.ts,
 * il resto dell'app non cambia.
 */

export interface DbShape {
  classes: ClassRow[];
  auth_users: AuthUserRow[];
  profiles: ProfileRow[];
  memberships: MembershipRow[];
  posts: PostRow[];
  polls: PollRow[];
  poll_options: PollOptionRow[];
  poll_votes: PollVoteRow[];
  requests: RequestRow[];
  magic_links: MagicLinkRow[];
  one_time_secrets: OneTimeSecretRow[];
  outbox: OutboxEmailRow[];
}

const EMPTY_DB: DbShape = {
  classes: [],
  auth_users: [],
  profiles: [],
  memberships: [],
  posts: [],
  polls: [],
  poll_options: [],
  poll_votes: [],
  requests: [],
  magic_links: [],
  one_time_secrets: [],
  outbox: [],
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDb(): DbShape {
  ensureDataDir();
  if (!existsSync(DB_PATH)) {
    return structuredClone(EMPTY_DB);
  }
  const raw = readFileSync(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Partial<DbShape>;
  // Merge con lo scheletro vuoto: se aggiungiamo tabelle nuove,
  // i db.json vecchi continuano a funzionare.
  return { ...structuredClone(EMPTY_DB), ...parsed };
}

/** Legge il DB, applica la modifica, salva. Ritorna il valore di fn. */
export function mutateDb<T>(fn: (db: DbShape) => T): T {
  ensureDataDir();
  const db = readDb();
  const result = fn(db);
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  return result;
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
