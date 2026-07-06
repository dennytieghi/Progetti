import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/require-membership";

/**
 * Area riservata: serve una sessione. La verifica membership 'active'
 * sulla classe specifica avviene nel layout di /c/[classCode] e,
 * di nuovo, in OGNI Server Action (difesa in profondità).
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/");
  return <div className="min-h-screen">{children}</div>;
}
