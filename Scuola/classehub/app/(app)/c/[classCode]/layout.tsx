import { AppHeader } from "@/components/shared/AppHeader";
import { requireActiveMembership } from "@/lib/auth/require-membership";
import { FEATURES } from "@/lib/features";
import { countPendingDeclarations, listRequests } from "@/lib/db/queries";

/**
 * Layout della classe: blocca chi non è membro attivo (ADR-011)
 * e mostra l'header con la navigazione.
 */
export default async function ClassLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ classCode: string }>;
}>) {
  const { classCode } = await params;
  const ctx = await requireActiveMembership(classCode);

  const openRequestsCount =
    ctx.isRepresentative && FEATURES.richieste
      ? (await listRequests(ctx.klass.id)).filter((r) => r.status === "open").length
      : 0;
  const pendingDeclarationsCount = ctx.isRepresentative
    ? await countPendingDeclarations(ctx.klass.id)
    : 0;

  return (
    <div className="md:flex">
      <AppHeader
        classCode={ctx.klass.class_code}
        className={ctx.klass.name}
        displayName={ctx.profile?.display_name ?? ctx.user.email}
        isRepresentative={ctx.isRepresentative}
        openRequestsCount={openRequestsCount}
        pendingDeclarationsCount={pendingDeclarationsCount}
      />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
