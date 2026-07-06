import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";

/**
 * Sessione con cookie firmato (HMAC): nessuno può falsificare l'utente
 * senza il segreto del server. In produzione questo modulo viene
 * sostituito dalla sessione di Supabase Auth (@supabase/ssr).
 */

const COOKIE_NAME = "ch_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 giorni

function getSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  // Dev: genera un segreto la prima volta e riusalo (persistito su disco).
  const dir = path.join(process.cwd(), ".data");
  const file = path.join(dir, "session-secret");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(file)) return readFileSync(file, "utf-8").trim();
  const secret = randomBytes(32).toString("hex");
  writeFileSync(file, secret, "utf-8");
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ uid: userId })).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
    };
    return parsed.uid ?? null;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
