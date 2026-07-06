import { randomInt, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Alfabeto human-friendly: niente caratteri ambigui (0/O, 1/I/l).
 * Vedi ARCHITECTURE.md §Codici human-friendly.
 */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** Codice classe: 6 caratteri, da distribuire ai genitori. */
export function generateClassCode(): string {
  return generateCode(6);
}

/** Codice di emergenza: 12 caratteri, mostrato una volta sola. */
export function generateEmergencyCode(): string {
  return generateCode(12);
}

/** Slug post: 4 caratteri, unico per classe (URL corti per WhatsApp). */
export function generatePostSlug(): string {
  return generateCode(4).toLowerCase();
}

/**
 * Hash del codice di emergenza con scrypt (KDF robusta inclusa in Node,
 * nessuna dipendenza esterna). Formato salvato: "salt:hash" in hex.
 * In produzione Supabase l'equivalente è crypt() di pgcrypto (bcrypt).
 */
export function hashEmergencyCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(code.toUpperCase(), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyEmergencyCode(code: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(code.toUpperCase(), salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** Normalizza un codice scritto dall'utente (spazi, minuscole). */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
