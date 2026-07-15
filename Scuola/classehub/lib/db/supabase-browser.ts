"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase per il BROWSER (solo chiave pubblica, mai la secret
 * — CLAUDE.md §7). Serve al giro OAuth di Google: il redirect deve
 * partire dal browser dell'utente.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
