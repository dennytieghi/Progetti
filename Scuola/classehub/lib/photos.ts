import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { it } from "@/lib/i18n/it";

/**
 * Foto degli avvisi/materiali — PoC: salvate in .data/uploads/{classId}/.
 * Produzione: bucket Supabase Storage `class-photos` con policy per
 * membri attivi (ARCHITECTURE §Storage) + conversione HEIC via sharp.
 */

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function savePhoto(
  classId: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { ok: false, error: it.nuovo.fotoErroreTipo };
  if (file.size > MAX_BYTES) return { ok: false, error: it.nuovo.fotoErroreDimensione };

  const dir = path.join(UPLOAD_DIR, classId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const name = `${randomUUID()}.${ext}`;
  writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, path: name };
}

/** Nome file rigido (uuid.ext): blocca ogni path traversal. */
const SAFE_NAME = /^[a-f0-9-]{36}\.(jpg|png)$/;

export function readPhoto(
  classId: string,
  name: string
): { data: Buffer; contentType: string } | null {
  if (!SAFE_NAME.test(name)) return null;
  const filePath = path.join(UPLOAD_DIR, classId, name);
  if (!existsSync(filePath)) return null;
  return {
    data: readFileSync(filePath),
    contentType: name.endsWith(".png") ? "image/png" : "image/jpeg",
  };
}
