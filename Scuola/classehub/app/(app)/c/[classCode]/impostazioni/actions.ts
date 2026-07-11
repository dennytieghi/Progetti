"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRepresentative } from "@/lib/auth/require-membership";
import { updateClassPaymentInfo } from "@/lib/db/mutations";
import { paymentCoordsSchema } from "@/lib/validation/schemas";
import { it } from "@/lib/i18n/it";
import type { FormState } from "@/lib/form-state";

export async function salvaCoordinatePagamentoAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const classCode = typeof formData.get("classCode") === "string"
    ? (formData.get("classCode") as string)
    : "";
  const ctx = await requireRepresentative(classCode);

  const parsed = paymentCoordsSchema.safeParse({
    iban: formData.get("iban"),
    ibanHolder: formData.get("ibanHolder"),
    paypal: formData.get("paypal"),
    satispay: formData.get("satispay"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? it.common.erroreGenerico };
  }

  await updateClassPaymentInfo(ctx.klass.id, parsed.data);
  revalidatePath(`/c/${classCode}/impostazioni`);
  revalidatePath(`/c/${classCode}/cassa`);
  redirect(`/c/${classCode}/impostazioni?pagamenti=1`);
}
