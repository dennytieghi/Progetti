"use server";

import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { getRequestById } from "@/lib/db/queries";
import { setRequestStatus } from "@/lib/db/mutations";

/** Archivia una richiesta senza pubblicarla: solo rappresentante. */
export async function archiviaRichiestaAction(formData: FormData): Promise<void> {
  const classCode = formData.get("classCode");
  const requestId = formData.get("requestId");
  if (typeof classCode !== "string" || typeof requestId !== "string") return;

  const ctx = await requireRepresentative(classCode);
  const request = await getRequestById(requestId);
  // La richiesta deve appartenere alla classe del rappresentante.
  if (request && request.class_id === ctx.klass.id) {
    await setRequestStatus(requestId, "archived");
    revalidatePath(`/c/${classCode}/richieste`);
  }
}
