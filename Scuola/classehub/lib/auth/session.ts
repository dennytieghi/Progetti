import "server-only";
import { supabaseServer } from "@/lib/db/supabase";

/**
 * Sessione = sessione di Supabase Auth (cookie gestiti da @supabase/ssr).
 * `getUser()` valida il token con il server Supabase ad ogni chiamata:
 * un cookie contraffatto non passa.
 */

export async function getSessionUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Utente della sessione (id + email) o null. */
export async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

export async function destroySession(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}
