"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getPostBySlug } from "@/lib/db/queries";
import { updatePost } from "@/lib/db/mutations";
import { createNoticeSchema, editDeadlineSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/**
 * Modifica di un post pubblicato: SOLO rappresentante. Titolo e testo
 * per tutti i tipi; la data solo per le scadenze. Le opzioni dei
 * sondaggi restano intoccabili (qualcuno potrebbe aver già votato).
 */
export async function modificaPostAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const slug = str(formData, "slug");
  const ctx = await requireRepresentative(classCode);

  const post = await getPostBySlug(ctx.klass.id, slug);
  if (!post) return { error: it.dettaglio.nonTrovatoTesto };

  if (post.type === "deadline") {
    const parsed = editDeadlineSchema.safeParse({
      title: formData.get("title"),
      body: formData.get("body"),
      dueDate: formData.get("dueDate"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
    }
    await updatePost({
      postId: post.id,
      title: parsed.data.title,
      body: parsed.data.body,
      dueDate: parsed.data.dueDate,
    });
  } else {
    const parsed = createNoticeSchema.safeParse({
      title: formData.get("title"),
      body: formData.get("body"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
    }
    await updatePost({
      postId: post.id,
      title: parsed.data.title,
      body: parsed.data.body,
    });
  }

  revalidatePath(`/c/${classCode}`);
  revalidatePath(`/c/${classCode}/p/${slug}`);
  redirect(`/c/${classCode}/p/${slug}?modificato=1`);
}
