import "server-only";
import {
  generateClassCode,
  generateEmergencyCode,
  generatePostSlug,
  hashEmergencyCode,
} from "@/lib/codes/generate";
import { supabaseAdmin, supabaseServer } from "./supabase";
import type {
  CashMovementRow,
  ClassRow,
  MembershipRow,
  PaymentMethod,
  PostRow,
  PostType,
  RequestRow,
} from "./types";

/**
 * Helper di scrittura su Supabase.
 * Default: client utente — l'RLS è il vero controllo di accesso
 * (rappresentante per approvare/pubblicare, membro attivo non
 * silenziato per votare/scrivere).
 * Client admin SOLO dove l'RLS non prevede scritture client, con
 * motivo a fianco.
 */

const UNIQUE_VIOLATION = "23505";

// ---------------------------------------------------------------- profili

export async function upsertProfile(userId: string, displayName: string): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, display_name: displayName }, { onConflict: "user_id" });
  if (error) throw new Error(`Salvataggio profilo fallito: ${error.message}`);
}

// ---------------------------------------------------------------- classi

/**
 * Crea classe + membership del rappresentante (subito active).
 * ADMIN: per sicurezza nessun client può inserire classi (niente policy
 * insert) né darsi da solo il ruolo di rappresentante; succede solo qui,
 * lato server, dopo che l'email è stata verificata dal callback.
 * Ritorna il codice di emergenza IN CHIARO: va mostrato una sola volta.
 */
export async function createClassWithRepresentative(input: {
  className: string;
  representativeUserId: string;
}): Promise<{ klass: ClassRow; emergencyCode: string }> {
  const admin = supabaseAdmin();
  const emergencyCode = generateEmergencyCode();

  // Il codice classe deve essere unico: sul conflitto si riprova
  // (con 6 char su alfabeto da 31 la collisione è rarissima).
  let klass: ClassRow | null = null;
  for (let attempt = 0; attempt < 5 && !klass; attempt++) {
    const { data, error } = await admin
      .from("classes")
      .insert({
        class_code: generateClassCode(),
        name: input.className,
        emergency_code_hash: hashEmergencyCode(emergencyCode),
      })
      .select()
      .single();
    if (error && error.code !== UNIQUE_VIOLATION) {
      throw new Error(`Creazione classe fallita: ${error.message}`);
    }
    klass = (data as ClassRow | null) ?? null;
  }
  if (!klass) throw new Error("Creazione classe fallita: codice non disponibile.");

  const { error: memberError } = await admin.from("memberships").insert({
    user_id: input.representativeUserId,
    class_id: klass.id,
    role: "representative",
    status: "active",
    decided_at: new Date().toISOString(),
    decided_by: input.representativeUserId,
  });
  if (memberError) {
    throw new Error(`Creazione rappresentante fallita: ${memberError.message}`);
  }

  return { klass, emergencyCode };
}

// ---------------------------------------------------------------- membership

/**
 * Richiesta di iscrizione del genitore: nasce sempre 'pending' (ADR-001).
 * ADMIN: chi era stato rifiutato o rimosso può riprovare, e quel
 * ritorno a pending è un UPDATE della propria riga che l'RLS riserva
 * al rappresentante. Gira solo nel callback, dopo email verificata.
 */
export async function createPendingMembership(input: {
  userId: string;
  classId: string;
  noteForRep: string | null;
}): Promise<MembershipRow> {
  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("memberships")
    .select("*")
    .eq("user_id", input.userId)
    .eq("class_id", input.classId)
    .maybeSingle();

  if (existing) {
    const row = existing as MembershipRow;
    if (row.status === "rejected" || row.status === "removed") {
      const { data, error } = await admin
        .from("memberships")
        .update({
          status: "pending",
          note_for_rep: input.noteForRep,
          rejection_reason: null,
          joined_at: new Date().toISOString(),
          decided_at: null,
          decided_by: null,
          ended_at: null,
        })
        .eq("id", row.id)
        .select()
        .single();
      if (error) throw new Error(`Nuova richiesta fallita: ${error.message}`);
      return data as MembershipRow;
    }
    return row;
  }

  const { data, error } = await admin
    .from("memberships")
    .insert({
      user_id: input.userId,
      class_id: input.classId,
      role: "parent",
      status: "pending",
      note_for_rep: input.noteForRep,
    })
    .select()
    .single();
  if (error) throw new Error(`Richiesta di iscrizione fallita: ${error.message}`);
  return data as MembershipRow;
}

/** Approvazione: status active, nota azzerata (PROJECT_SPEC §Onboarding). */
export async function approveMembership(
  membershipId: string,
  deciderId: string
): Promise<void> {
  const supabase = await supabaseServer();
  await supabase
    .from("memberships")
    .update({
      status: "active",
      decided_at: new Date().toISOString(),
      decided_by: deciderId,
      note_for_rep: null,
    })
    .eq("id", membershipId)
    .eq("status", "pending");
}

export async function rejectMembership(
  membershipId: string,
  deciderId: string,
  reason: string | null
): Promise<void> {
  const supabase = await supabaseServer();
  await supabase
    .from("memberships")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: deciderId,
      rejection_reason: reason,
      note_for_rep: null,
    })
    .eq("id", membershipId)
    .eq("status", "pending");
}

/** Rimozione soft (status 'removed'), mai cancellazione fisica. */
export async function removeMembership(
  membershipId: string,
  deciderId: string
): Promise<void> {
  const supabase = await supabaseServer();
  await supabase
    .from("memberships")
    .update({
      status: "removed",
      ended_at: new Date().toISOString(),
      decided_by: deciderId,
    })
    .eq("id", membershipId)
    .eq("status", "active")
    .eq("role", "parent");
}

export async function setMuted(membershipId: string, muted: boolean): Promise<void> {
  const supabase = await supabaseServer();
  await supabase
    .from("memberships")
    .update({ muted })
    .eq("id", membershipId)
    .eq("status", "active")
    .eq("role", "parent");
}

// ---------------------------------------------------------------- post

export async function createPost(input: {
  classId: string;
  authorId: string;
  type: PostType;
  title: string;
  body: string | null;
  dueDate: string | null;
  photoPath: string | null;
  /** Solo per type='poll'. */
  poll?: { closesAt: string; options: string[] };
}): Promise<PostRow> {
  const supabase = await supabaseServer();

  // Slug unico dentro la classe (URL corti per WhatsApp): sul conflitto
  // si riprova con uno slug nuovo.
  let post: PostRow | null = null;
  for (let attempt = 0; attempt < 5 && !post; attempt++) {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        class_id: input.classId,
        author_id: input.authorId,
        type: input.type,
        slug: generatePostSlug(),
        title: input.title,
        body: input.body,
        due_date: input.dueDate,
        photo_path: input.photoPath,
      })
      .select()
      .single();
    if (error && error.code !== UNIQUE_VIOLATION) {
      throw new Error(`Pubblicazione fallita: ${error.message}`);
    }
    post = (data as PostRow | null) ?? null;
  }
  if (!post) throw new Error("Pubblicazione fallita: riprova.");

  if (input.type === "poll" && input.poll) {
    // Il salt del sondaggio lo genera il database (default della colonna).
    const { error: pollError } = await supabase.from("polls").insert({
      post_id: post.id,
      closes_at: input.poll.closesAt,
    });
    if (pollError) throw new Error(`Creazione sondaggio fallita: ${pollError.message}`);

    const { error: optionsError } = await supabase.from("poll_options").insert(
      input.poll.options.map((label, ord) => ({ post_id: post!.id, label, ord }))
    );
    if (optionsError) {
      throw new Error(`Creazione opzioni fallita: ${optionsError.message}`);
    }
  }

  return post;
}

/**
 * Modifica dopo la pubblicazione: titolo, testo e (per le scadenze)
 * data. Le opzioni dei sondaggi non si toccano mai: qualcuno potrebbe
 * aver già votato. edited_at segnala ai genitori che il post è cambiato.
 */
export async function updatePost(input: {
  postId: string;
  title: string;
  body: string | null;
  dueDate?: string | null;
}): Promise<void> {
  const supabase = await supabaseServer();
  const patch: Record<string, unknown> = {
    title: input.title,
    body: input.body,
    edited_at: new Date().toISOString(),
  };
  if (input.dueDate !== undefined) patch.due_date = input.dueDate;
  const { error } = await supabase.from("posts").update(patch).eq("id", input.postId);
  if (error) throw new Error(`Modifica fallita: ${error.message}`);
}

/**
 * Eliminazione definitiva (0005): sondaggio, opzioni e voti spariscono
 * in cascata; il collegamento delle richieste convertite si azzera.
 * L'RLS limita tutto al rappresentante della classe.
 */
export async function deletePost(post: PostRow): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("posts").delete().eq("id", post.id);
  if (error) throw new Error(`Eliminazione fallita: ${error.message}`);

  // Foto orfana in Storage: ADMIN perché il bucket non ha una policy
  // di delete client. Se fallisce pazienza: il post è già eliminato.
  if (post.photo_path) {
    await supabaseAdmin()
      .storage.from("class-photos")
      .remove([`${post.class_id}/${post.photo_path}`]);
  }
}

export async function setPinned(postId: string, pinned: boolean): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.from("posts").update({ pinned }).eq("id", postId);
}

export async function setArchived(postId: string, archived: boolean): Promise<void> {
  const supabase = await supabaseServer();
  await supabase
    .from("posts")
    .update(archived ? { archived: true, pinned: false } : { archived: false })
    .eq("id", postId);
}

// ---------------------------------------------------------------- sondaggi

/**
 * Registra il voto tramite la funzione del database cast_poll_vote
 * (ADR-003): l'hash anonimo si calcola lì dentro e il salt non esce mai.
 * Ritorna false se già votato, sondaggio chiuso o utente non abilitato.
 */
export async function castVote(input: {
  postId: string;
  optionIds: string[];
}): Promise<boolean> {
  if (input.optionIds.length === 0) return false;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("cast_poll_vote", {
    target_post: input.postId,
    chosen_options: input.optionIds,
  });
  if (error) return false;
  return data === true;
}

export async function closePoll(postId: string): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.from("polls").update({ closed_manually: true }).eq("post_id", postId);
}

// ---------------------------------------------------------------- richieste

export async function createRequest(input: {
  classId: string;
  authorId: string;
  body: string;
}): Promise<RequestRow | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("requests")
    .insert({ class_id: input.classId, author_id: input.authorId, body: input.body })
    .select()
    .single();
  // L'RLS blocca silenziati e oltre-limite: il messaggio gentile lo
  // danno i pre-controlli nella Server Action, qui basta il null.
  if (error) return null;
  return data as RequestRow;
}

export async function setRequestStatus(
  requestId: string,
  status: "handled" | "archived",
  convertedToPostId: string | null = null
): Promise<void> {
  const supabase = await supabaseServer();
  const patch: Record<string, unknown> = { status };
  if (convertedToPostId) patch.converted_to_post_id = convertedToPostId;
  await supabase.from("requests").update(patch).eq("id", requestId);
}

// ---------------------------------------------------------------- cassa

/**
 * Inserisce un movimento e le sue quote. Se le quote falliscono il
 * movimento viene rimosso: mai un movimento senza intestatari.
 * Scrive col client utente: l'RLS impone rappresentante.
 */
async function insertMovementWithShares(input: {
  classId: string;
  createdBy: string;
  kind: "deposit" | "expense";
  title: string;
  method: PaymentMethod;
  shares: Array<{ userId: string; amountCents: number }>;
}): Promise<CashMovementRow> {
  const supabase = await supabaseServer();
  const total = input.shares.reduce((sum, s) => sum + s.amountCents, 0);

  const { data, error } = await supabase
    .from("cash_movements")
    .insert({
      class_id: input.classId,
      kind: input.kind,
      title: input.title,
      total_cents: total,
      method: input.method,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(`Registrazione movimento fallita: ${error.message}`);
  const movement = data as CashMovementRow;

  const { error: sharesError } = await supabase.from("cash_shares").insert(
    input.shares.map((s) => ({
      movement_id: movement.id,
      user_id: s.userId,
      amount_cents: s.amountCents,
    }))
  );
  if (sharesError) {
    await supabase.from("cash_movements").delete().eq("id", movement.id);
    throw new Error(`Registrazione quote fallita: ${sharesError.message}`);
  }

  return movement;
}

/** Versamento registrato dal rappresentante, col metodo indicato. */
export async function recordCashDeposit(input: {
  classId: string;
  representativeId: string;
  parentId: string;
  amountCents: number;
  title: string;
  method: PaymentMethod;
}): Promise<CashMovementRow> {
  return insertMovementWithShares({
    classId: input.classId,
    createdBy: input.representativeId,
    kind: "deposit",
    title: input.title,
    method: input.method,
    shares: [{ userId: input.parentId, amountCents: input.amountCents }],
  });
}

/** Spesa: importo a testa, addebitata solo ai partecipanti scelti. */
export async function recordCashExpense(input: {
  classId: string;
  representativeId: string;
  title: string;
  perHeadCents: number;
  participantIds: string[];
  method: PaymentMethod;
}): Promise<CashMovementRow> {
  return insertMovementWithShares({
    classId: input.classId,
    createdBy: input.representativeId,
    kind: "expense",
    title: input.title,
    method: input.method,
    shares: input.participantIds.map((userId) => ({
      userId,
      amountCents: input.perHeadCents,
    })),
  });
}

/**
 * Modifica di una spesa manuale: causale, importo a testa, partecipanti.
 * Le quote vengono sostituite in blocco (delete + insert): più semplice
 * e più sicuro che calcolare le differenze. L'RLS limita tutto al
 * rappresentante e ai movimenti manuali.
 */
export async function updateCashExpense(input: {
  movementId: string;
  title: string;
  perHeadCents: number;
  participantIds: string[];
}): Promise<void> {
  const supabase = await supabaseServer();
  const total = input.perHeadCents * input.participantIds.length;

  const { error: deleteError } = await supabase
    .from("cash_shares")
    .delete()
    .eq("movement_id", input.movementId);
  if (deleteError) throw new Error(`Modifica quote fallita: ${deleteError.message}`);

  const { error: insertError } = await supabase.from("cash_shares").insert(
    input.participantIds.map((userId) => ({
      movement_id: input.movementId,
      user_id: userId,
      amount_cents: input.perHeadCents,
    }))
  );
  if (insertError) throw new Error(`Modifica quote fallita: ${insertError.message}`);

  const { error: updateError } = await supabase
    .from("cash_movements")
    .update({ title: input.title, total_cents: total })
    .eq("id", input.movementId);
  if (updateError) throw new Error(`Modifica spesa fallita: ${updateError.message}`);
}

/** Cancella un movimento della cassa (l'RLS impone rappresentante + classe). */
export async function deleteCashMovement(movementId: string): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.from("cash_movements").delete().eq("id", movementId);
}

// ---------------------------------------------------------------- segreti one-time

/**
 * ADMIN: la tabella one_time_secrets ha RLS senza alcuna policy —
 * nessun client può leggerla, i segreti passano solo da qui.
 */
export async function createOneTimeSecret(
  classId: string,
  emergencyCode: string
): Promise<string> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("one_time_secrets")
    .insert({ class_id: classId, emergency_code: emergencyCode })
    .select("id")
    .single();
  if (error) throw new Error(`Salvataggio segreto fallito: ${error.message}`);
  return (data as { id: string }).id;
}

/** Ritorna il codice di emergenza UNA sola volta, poi lo cancella. */
export async function consumeOneTimeSecret(
  secretId: string,
  classId: string
): Promise<string | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("one_time_secrets")
    .select("*")
    .eq("id", secretId)
    .eq("class_id", classId)
    .is("consumed_at", null)
    .maybeSingle();
  if (!data) return null;

  const code = (data as { emergency_code: string }).emergency_code;
  // Il codice in chiaro non resta nel database.
  await admin
    .from("one_time_secrets")
    .update({ consumed_at: new Date().toISOString(), emergency_code: "" })
    .eq("id", secretId);
  return code;
}
