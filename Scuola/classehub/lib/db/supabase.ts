import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Due client Supabase, con ruoli diversi:
 *
 * - `supabaseServer()`: usa la sessione dell'utente (cookie) e la chiave
 *   pubblica. OGNI query passa dalla RLS: l'utente vede e tocca solo ciò
 *   che le policy gli permettono. È il client di default.
 *
 * - `supabaseAdmin()`: usa la chiave segreta (solo server, mai nel
 *   browser — CLAUDE.md §7) e SCAVALCA la RLS. Va usato solo dove la RLS
 *   non può arrivare per costruzione: creazione classe (nessuna policy
 *   insert su classes), lookup del codice classe prima del login,
 *   generazione dei link d'accesso, email dei membri (auth.users non è
 *   leggibile dai client).
 */

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variabile d'ambiente mancante: ${name}. Controlla .env.local (vedi docs/SETUP.md).`
    );
  }
  return value;
}

export async function supabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Nei Server Component i cookie non si possono scrivere:
            // il refresh della sessione lo fa il middleware.
          }
        },
      },
    }
  );
}

export function supabaseAdmin(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
