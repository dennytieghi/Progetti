import { AppHeader } from "@/components/shared/AppHeader";
import { requireActiveMembership } from "@/lib/auth/require-membership";
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

  const openRequestsCount = ctx.isRepresentative
    ? (await listRequests(ctx.klass.id)).filter((r) => r.status === "open").length
    : 0;
  const pendingDeclarationsCount = ctx.isRepresentative
    ? await countPendingDeclarations(ctx.klass.id)
    : 0;

  return (
    <>
      <AppHeader
        classCode={ctx.klass.class_code}
        className={ctx.klass.name}
        isRepresentative={ctx.isRepresentative}
        openRequestsCount={openRequestsCount}
        pendingDeclarationsCount={pendingDeclarationsCount}
      />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </>
  );
}
