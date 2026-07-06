import { NextResponse } from "next/server";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { readPhoto } from "@/lib/photos";

/**
 * Serve le foto SOLO ai membri attivi della classe
 * (equivalente della policy Storage in produzione).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classCode: string; name: string }> }
) {
  const { classCode, name } = await params;
  const ctx = await requireActiveMembership(classCode);

  const photo = readPhoto(ctx.klass.id, name);
  if (!photo) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
