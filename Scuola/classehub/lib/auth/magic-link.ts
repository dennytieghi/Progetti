import "server-only";
import { supabaseAdmin, supabaseServer } from "@/lib/db/supabase";
import { getBaseUrl } from "@/lib/base-url";

/**
 * Invio del "magic link" con Supabase Auth.
 *
 * L'INTENTO (crea classe / entra in classe / solo accesso) viaggia nei
 * parametri dell'URL di callback: Supabase autentica l'email, il nostro
 * callback esegue l'intento. Manomettere i parametri non dà privilegi:
 * creare una classe o chiedere di entrare (pending) è ciò che chiunque
 * può già fare dal form pubblico.
 *
 * - In SVILUPPO (demo): il link viene generato con la chiave admin e
 *   mostrato nel riquadro giallo — niente email, nessun limite orario.
 * - In PRODUZIONE: Supabase manda l'email vera (signInWithOtp).
 */

export type LoginIntent =
  | { kind: "create_class"; className: string }
  | { kind: "join_class"; classId: string; noteForRep: string | null }
  | { kind: "login" };

const DEMO_MODE = process.env.NODE_ENV !== "production";

function intentToParams(intent: LoginIntent, displayName: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set("intent", intent.kind);
  params.set("nome", displayName);
  if (intent.kind === "create_class") params.set("classe", intent.className);
  if (intent.kind === "join_class") {
    params.set("classe_id", intent.classId);
    if (intent.noteForRep) params.set("nota", intent.noteForRep);
  }
  return params;
}

/**
 * Genera/invia il link d'accesso.
 * Ritorna il percorso demo da mostrare nel riquadro giallo (solo dev),
 * altrimenti null (l'email è partita davvero).
 */
export async function sendLoginLink(input: {
  email: string;
  displayName: string;
  intent: LoginIntent;
  /** false = porta di rientro: MAI creare account nuovi (spec V1.5). */
  createUser?: boolean;
}): Promise<{ demoPath: string | null }> {
  const email = input.email.trim().toLowerCase();
  const createUser = input.createUser ?? true;
  const params = intentToParams(input.intent, input.displayName);

  if (DEMO_MODE) {
    const admin = supabaseAdmin();

    if (createUser) {
      // L'utente deve esistere per generare il link; se c'è già va bene così.
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (created.error && created.error.code !== "email_exists") {
        throw new Error(`Creazione utente fallita: ${created.error.message}`);
      }
    }

    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) {
      // Porta di rientro: email sconosciuta → risposta NEUTRA, nessun link.
      if (!createUser) {
        // Risposta neutra all'utente (anti-enumerazione), ma il server tiene traccia.
        console.error(`[accedi] generazione link fallita (porta rientro): ${link.error.message}`);
        return { demoPath: null };
      }
      throw new Error(`Generazione link fallita: ${link.error.message}`);
    }

    params.set("token_hash", link.data.properties.hashed_token);
    return { demoPath: `/auth/callback?${params.toString()}` };
  }

  // Produzione: email vera. Supabase riporta l'utente sul nostro callback
  // con il codice di verifica; i parametri dell'intento restano nell'URL.
  const baseUrl = await getBaseUrl();
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?${params.toString()}`,
      shouldCreateUser: createUser,
    },
  });
  if (error) {
    // Email sconosciuta sulla porta di rientro: silenzio = neutro.
    if (!createUser) {
      // Risposta neutra all'utente (anti-enumerazione), ma il server tiene traccia.
      console.error(`[accedi] invio link fallito (porta rientro): ${error.message}`);
      return { demoPath: null };
    }
    throw new Error(`Invio email fallito: ${error.message}`);
  }
  return { demoPath: null };
}
