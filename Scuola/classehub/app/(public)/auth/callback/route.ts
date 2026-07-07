import { NextRequest, NextResponse } from "next/server";
import { getClassById, getMembership } from "@/lib/db/queries";
import {
  createClassWithRepresentative,
  createOneTimeSecret,
  createPendingMembership,
  upsertProfile,
} from "@/lib/db/mutations";
import { supabaseServer } from "@/lib/db/supabase";

/**
 * Callback del magic link (Supabase Auth). Qui l'email è verificata:
 * Supabase convalida il token e apre la sessione, poi noi eseguiamo
 * l'intento trasportato nei parametri dell'URL:
 * - create_class: crea classe + membership del rappresentante (active)
 *   + segreto one-time per mostrare il codice di emergenza una volta;
 * - join_class: crea membership 'pending' con nota per il rappresentante;
 * - login: solo sessione, si va sull'account.
 * Manomettere i parametri non dà privilegi: sono le stesse azioni dei
 * form pubblici, e un pending resta un pending.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const supabase = await supabaseServer();

  // Demo/dev: token_hash generato dall'admin. Produzione: code (email vera).
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const auth = tokenHash
    ? await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : null;

  const user = auth?.data.user ?? null;
  if (!auth || auth.error || !user) {
    return NextResponse.redirect(new URL("/link-non-valido", request.url));
  }

  const displayName = params.get("nome")?.trim();
  if (displayName) {
    await upsertProfile(user.id, displayName);
  }

  const intent = params.get("intent");

  if (intent === "create_class") {
    const className = params.get("classe")?.trim();
    if (!className) {
      return NextResponse.redirect(new URL("/link-non-valido", request.url));
    }
    const { klass, emergencyCode } = await createClassWithRepresentative({
      className,
      representativeUserId: user.id,
    });
    const secretId = await createOneTimeSecret(klass.id, emergencyCode);
    return NextResponse.redirect(
      new URL(`/c/${klass.class_code}/stampa?segreto=${secretId}`, request.url)
    );
  }

  if (intent === "join_class") {
    const classId = params.get("classe_id");
    const klass = classId ? await getClassById(classId) : null;
    if (!klass) {
      return NextResponse.redirect(new URL("/link-non-valido", request.url));
    }
    // Se era già attivo (link vecchio ricliccato), va dritto in bacheca.
    const existing = await getMembership(user.id, klass.id);
    if (existing?.status === "active") {
      return NextResponse.redirect(new URL(`/c/${klass.class_code}`, request.url));
    }
    await createPendingMembership({
      userId: user.id,
      classId: klass.id,
      noteForRep: params.get("nota") || null,
    });
    return NextResponse.redirect(
      new URL(`/in-attesa?classe=${klass.class_code}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/account", request.url));
}
