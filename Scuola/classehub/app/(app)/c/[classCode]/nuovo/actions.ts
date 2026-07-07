"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getRequestById } from "@/lib/db/queries";
import { createPost, setRequestStatus } from "@/lib/db/mutations";
import { savePhoto } from "@/lib/photos";
import {
  createDeadlineSchema,
  createMaterialSchema,
  createNoticeSchema,
  createPollSchema,
} from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";
import type { PostType } from "@/lib/db/types";

/**
 * Pubblicazione post: SOLO rappresentante attivo (guard su ogni action).
 * Se il post nasce da una richiesta di un genitore, la richiesta viene
 * marcata 'handled' e collegata al post (triage con 2 click).
 */

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Collega l'eventuale richiesta di origine, verificando che sia della classe. */
async function linkRequest(formData: FormData, classId: string, postId: string): Promise<void> {
  const requestId = str(formData, "requestId");
  if (!requestId) return;
  const request = await getRequestById(requestId);
  if (request && request.class_id === classId) {
    await setRequestStatus(requestId, "handled", postId);
  }
}

function finish(classCode: string, slug: string): never {
  revalidatePath(`/c/${classCode}`);
  redirect(`/c/${classCode}/p/${slug}?fatto=1`);
}

async function createSimplePost(
  type: Exclude<PostType, "poll">,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  let dueDate: string | null = null;
  if (type === "deadline") {
    const parsedDeadline = createDeadlineSchema.safeParse({
      title: formData.get("title"),
      body: formData.get("body"),
      dueDate: formData.get("dueDate"),
    });
    if (!parsedDeadline.success) {
      return {
        error: parsedDeadline.error.issues[0]?.message ?? it.common.erroreGenerico,
      };
    }
    dueDate = parsedDeadline.data.dueDate;
  }

  const schema = type === "material" ? createMaterialSchema : createNoticeSchema;
  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  // Foto opzionale, solo per Materiale (ADR-004: foto sì, PDF no).
  let photoPath: string | null = null;
  if (type === "material") {
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const saved = await savePhoto(ctx.klass.id, photo);
      if (!saved.ok) return { error: saved.error };
      photoPath = saved.path;
    }
  }

  const post = await createPost({
    classId: ctx.klass.id,
    authorId: ctx.user.id,
    type,
    title: parsed.data.title,
    body: parsed.data.body,
    dueDate,
    photoPath,
  });
  await linkRequest(formData, ctx.klass.id, post.id);
  finish(classCode, post.slug);
}

export async function creaAvvisoAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  return createSimplePost("notice", formData);
}

export async function creaScadenzaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  return createSimplePost("deadline", formData);
}

export async function creaMaterialeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  return createSimplePost("material", formData);
}

export async function creaSondaggioAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const ctx = await requireRepresentative(classCode);

  const options = formData
    .getAll("options")
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter((o) => o.length > 0);

  const parsed = createPollSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    closesAt: formData.get("closesAt"),
    options,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  // Si vota fino alla fine del giorno scelto (23:59 locali).
  const closesAt = new Date(`${parsed.data.closesAt}T23:59:59`).toISOString();

  const post = await createPost({
    classId: ctx.klass.id,
    authorId: ctx.user.id,
    type: "poll",
    title: parsed.data.title,
    body: parsed.data.body,
    dueDate: null,
    photoPath: null,
    poll: { closesAt, options: parsed.data.options },
  });
  await linkRequest(formData, ctx.klass.id, post.id);
  finish(classCode, post.slug);
}
