import { requireRepresentative } from "@/lib/auth/require-membership";
import { listActiveMembers } from "@/lib/db/queries";
import { it } from "@/lib/i18n/it";
import { SpesaForm } from "../SpesaForm";

export const metadata = { title: `${it.cassa.spesoTitolo} — ${it.app.name}` };

export default async function SpesaPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const ctx = await requireRepresentative(classCode);
  const members = await listActiveMembers(ctx.klass.id);
  const memberOptions = members.map((m) => ({
    userId: m.membership.user_id,
    name: m.profile?.display_name ?? m.email ?? "?",
  }));

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.cassa.spesoTitolo}</h1>
        <p className="mt-1 text-ink-soft">{it.cassa.registraSpesaSpiega}</p>
      </div>
      <SpesaForm classCode={classCode} members={memberOptions} />
    </div>
  );
}
