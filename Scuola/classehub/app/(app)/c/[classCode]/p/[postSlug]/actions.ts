"use server";

import { revalidatePath } from "next/cache";
import {
  requireActiveMembership,
  requireRepresentative,
} from "@/lib/auth/require-membership";
import { getPoll, getPostBySlug, hasVoted, isPollClosed } from "@/lib/db/queries";
import { castVote, closePoll, setArchived, setPinned } from "@/lib/db/mutations";
import { voteSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
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
