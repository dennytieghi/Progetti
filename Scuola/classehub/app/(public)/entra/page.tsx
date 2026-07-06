import { it } from "@/lib/i18n/it";
import { EntraForm } from "./EntraForm";

export const metadata = { title: `${it.entra.titolo} — ${it.app.name}` };

export default async function EntraPage({
  searchParams,
}: {
  searchParams: Promise<{ codice?: string }>;
}) {
  const { codice } = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-[28px] font-bold">{it.entra.titolo}</h1>
      <p className="mb-6 mt-1 text-ink-soft">{it.entra.sottotitolo}</p>
      <EntraForm prefilledCode={codice ?? ""} />
    </div>
  );
}
