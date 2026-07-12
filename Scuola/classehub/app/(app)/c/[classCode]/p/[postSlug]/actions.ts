"use server";

import { revalidatePath } from "next/cache";
import {
  requireActiveMembership,
  requireRepresentative,
} from "@/lib/auth/require-membership";
import { redirect } from "next/navigation";
import { getPoll, getPostBySlug, hasVoted, isPollClosed } from "@/lib/db/queries";
import {
  castVote,
  closePoll,
  deletePost,
  setArchived,
  setPinned,
  setPostRead,
} from "@/lib/db/mutations";
import { voteSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/**
 * "L'ho visto": il membro attivo segna (o toglie) il visto su avvisi,
 * scadenze e materiale. Sui sondaggi non esiste: lì conta il voto.
 */
export async function segnaVistoAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const slug = str(formData, "slug");
  const visto = str(formData, "visto") === "1";
  const ctx = await requireActiveMembership(classCode);

  const post = await getPostBySlug(ctx.klass.id, slug);
  if (!post || post.type === "poll") redirect(`/c/${classCode}`);

  await setPostRead({ postId: post.id, userId: ctx.user.id, visto });
  revalidatePath(`/c/${classCode}/p/${slug}`);
  revalidatePath(`/c/${classCode}`);
  redirect(`/c/${classCode}/p/${slug}`);
}

/** Voto: membro attivo, non silenziato, sondaggio aperto, un voto a testa. */
export async function votaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = str(formData, "classCode");
  const slug = str(formData, "slug");
  const ctx = await requireActiveMembership(classCode);

  if (ctx.membership.muted) return { error: it.errori.silenziato };

  const post = await getPostBySlug(ctx.klass.id, slug);
  const poll = post ? await getPoll(post.id) : null;
  if (!post || !poll) return { error: it.common.erroreGenerico };
  if (isPollClosed(poll)) return { error: it.sondaggio.erroreChiuso };
  if (await hasVoted(post.id)) return { error: it.sondaggio.erroreGiaVotato };

  const parsed = voteSchema.safeParse({
    optionIds: formData.getAll("optionIds").filter((v) => typeof v === "string"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  const ok = await castVote({ postId: post.id, optionIds: parsed.data.optionIds });
  if (!ok) return { error: it.common.erroreGenerico };

  revalidatePath(`/c/${classCode}/p/${slug}`);
  return { error: null };
}

/** Chiusura anticipata del sondaggio: solo rappresentante. */
export async function chiudiSondaggioAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const slug = str(formData, "slug");
  const ctx = await requireRepresentative(classCode);

  const post = await getPostBySlug(ctx.klass.id, slug);
  if (post?.type === "poll") {
    await closePoll(post.id);
    revalidatePath(`/c/${classCode}/p/${slug}`);
  }
}

/** Fissa/togli dall'evidenza: solo rappresentante. */
export async function togglePinAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const slug = str(formData, "slug");
  const ctx = await requireRepresentative(classCode);

  const post = await getPostBySlug(ctx.klass.id, slug);
  if (post) {
    await setPinned(post.id, !post.pinned);
    revalidatePath(`/c/${classCode}`);
    revalidatePath(`/c/${classCode}/p/${slug}`);
  }
}

/** Eliminazione definitiva: solo rappresentante, con conferma a monte. */
export async function eliminaPostAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const slug = str(formData, "slug");
  const ctx = await requireRepresentative(classCode);

  const post = await getPostBySlug(ctx.klass.id, slug);
  if (post) await deletePost(post);

  revalidatePath(`/c/${classCode}`);
  redirect(`/c/${classCode}?eliminato=1`);
}

/** Archivia / riporta in bacheca: solo rappresentante. */
export async function toggleArchivioAction(formData: FormData): Promise<void> {
  const classCode = str(formData, "classCode");
  const slug = str(formData, "slug");
  const ctx = await requireRepresentative(classCode);

  const post = await getPostBySlug(ctx.klass.id, slug);
  if (post) {
    await setArchived(post.id, !post.archived);
    revalidatePath(`/c/${classCode}`);
    revalidatePath(`/c/${classCode}/p/${slug}`);
  }
}
