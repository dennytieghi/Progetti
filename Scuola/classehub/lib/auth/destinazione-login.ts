import type { MembershipStatus } from "@/lib/db/types";

/**
 * Dove atterra un utente dopo il login di rientro (spec V1.5):
 * 0 classi attive → benvenuto; 1 → la sua bacheca; 2+ → Le mie classi.
 * Le membership pending/rejected/removed non contano: un pending non
 * vede nulla (ADR-011) e trova il suo stato in /classi o /in-attesa.
 */
export function destinazionePostLogin(
  memberships: Array<{ status: MembershipStatus; classCode: string }>
): string {
  const attive = memberships.filter((m) => m.status === "active");
  if (attive.length === 0) return "/benvenuto";
  if (attive.length === 1) return `/c/${attive[0]!.classCode}`;
  return "/classi";
}
