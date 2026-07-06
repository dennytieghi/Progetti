import { NextRequest, NextResponse } from "next/server";
import { getClassById, getMembership } from "@/lib/db/queries";
import {
  consumeMagicLink,
  createClassWithRepresentative,
  createOneTimeSecret,
  createPendingMembership,
  upsertAuthUser,
  upsertProfile,
} from "@/lib/db/mutations";
import { createSession } from "@/lib/auth/session";

/**
 * Callback del magic link. Qui l'email è verificata (l'utente ha
 * cliccato il link ricevuto), quindi:
 * - rappresentante: crea classe + membership active + segreto one-time
 *   per mostrare il codice di emergenza una sola volta;
 * - genitore: crea membership 'pending' con nota per il rappresentante.
 * In produzione questa logica vive nel callback di Supabase Auth.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const link = token ? consumeMagicLink(token) : null;
  if (!link) {
    return NextResponse.redirect(new URL("/link-non-valido", request.url));
  }

  const user = upsertAuthUser(link.email);
  upsertProfile(user.id, link.display_name);
  await createSession(user.id);

  const payload = link.payload;

  if (payload.kind === "create_class") {
    const { klass, emergencyCode } = createClassWithRepresentative({
      className: payload.class_name,
      representativeUserId: user.id,
    });
    const secretId = createOneTimeSecret(klass.id, emergencyCode);
    return NextResponse.redirect(
      new URL(`/c/${klass.class_code}/stampa?segreto=${secretId}`, request.url)
    );
  }

  if (payload.kind === "join_class") {
    const klass = getClassById(payload.class_id);
    if (!klass) {
      return NextResponse.redirect(new URL("/link-non-valido", request.url));
    }
    // Se era già attivo (link vecchio ricliccato), va dritto in bacheca.
    const existing = getMembership(user.id, klass.id);
    if (existing?.status === "active") {
      return NextResponse.redirect(new URL(`/c/${klass.class_code}`, request.url));
    }
    createPendingMembership({
      userId: user.id,
      classId: klass.id,
      noteForRep: payload.note_for_rep,
    });
    return NextResponse.redirect(
      new URL(`/in-attesa?classe=${klass.class_code}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/account", request.url));
}
