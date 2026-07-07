import "server-only";
import { notFound, redirect } from "next/navigation";
import { getClassByCode, getMembership, getProfile } from "@/lib/db/queries";
import type { ClassRow, MembershipRow, ProfileRow } from "@/lib/db/types";
import { getSessionUser } from "./session";

/**
 * Guardie di sicurezza per pagine e Server Actions.
 * Regola non negoziabile (CLAUDE.md §7): ogni operazione su una classe
 * verifica membership.status = 'active'. Un pending non può fare NULLA.
 * Con Supabase c'è una seconda rete: anche saltando queste guardie,
 * l'RLS nel database applica le stesse regole.
 */

export interface SessionUser {
  id: string;
  email: string;
}

export interface UserContext {
  user: SessionUser;
  profile: ProfileRow | null;
}

export interface ClassContext extends UserContext {
  klass: ClassRow;
  membership: MembershipRow;
  isRepresentative: boolean;
}

export async function getCurrentUser(): Promise<UserContext | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return { user, profile: await getProfile(user.id) };
}

/**
 * Richiede membership ATTIVA nella classe. Altrimenti reindirizza:
 * - nessuna sessione o nessuna membership → form di ingresso
 * - pending / rejected → schermata di attesa (ADR-011: blocco totale)
 * - removed → form di ingresso (può richiedere di rientrare)
 */
export async function requireActiveMembership(classCode: string): Promise<ClassContext> {
  const ctx = await getCurrentUser();
  if (!ctx) redirect(`/entra?codice=${encodeURIComponent(classCode)}`);

  const klass = await getClassByCode(classCode);
  if (!klass) notFound();

  const membership = await getMembership(ctx.user.id, klass.id);
  if (!membership || membership.status === "removed") {
    redirect(`/entra?codice=${encodeURIComponent(classCode)}`);
  }
  if (membership.status === "pending" || membership.status === "rejected") {
    redirect(`/in-attesa?classe=${encodeURIComponent(classCode)}`);
  }

  return {
    ...ctx,
    klass,
    membership,
    isRepresentative: membership.role === "representative",
  };
}

/** Come sopra, ma richiede anche il ruolo di rappresentante. */
export async function requireRepresentative(classCode: string): Promise<ClassContext> {
  const ctx = await requireActiveMembership(classCode);
  if (!ctx.isRepresentative) {
    redirect(`/c/${encodeURIComponent(classCode)}`);
  }
  return ctx;
}
