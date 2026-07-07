import "server-only";
import { randomUUID } from "node:crypto";
import { it } from "@/lib/i18n/it";
import { supabaseServer } from "@/lib/db/supabase";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/upload-limits";

/**
 * Foto degli avvisi/materiali — bucket privato Supabase Storage
 * `class-photos`, percorso {class_id}/{uuid}.{ext}. Le policy del
 * bucket: carica solo il rappresentante, legge solo un membro attivo
 * della classe (migrazione 0001, sezione Storage).
 */

const BUCKET = "class-photos";

export async function savePhoto(
  classId: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const ext = ALLOWED_PHOTO_TYPES[file.type];
  if (!ext) return { ok: false, error: it.nuovo.fotoErroreTipo };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: it.nuovo.fotoErroreDimensione };

  const name = `${randomUUID()}.${ext}`;
  const supabase = await supabaseServer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`${classId}/${name}`, file, { contentType: file.type });
  if (error) return { ok: false, error: it.common.erroreGenerico };
  return { ok: true, path: name };
}

/** Nome file rigido (uuid.ext): blocca ogni path traversal. */
const SAFE_NAME = /^[a-f0-9-]{36}\.(jpg|png)$/;

export async function readPhoto(
  classId: string,
  name: string
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!SAFE_NAME.test(name)) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(`${classId}/${name}`);
  if (error || !data) return null;
  return {
    data: Buffer.from(await data.arrayBuffer()),
    contentType: name.endsWith(".png") ? "image/png" : "image/jpeg",
  };
}
