import { it } from "@/lib/i18n/it";
import { CreaClasseForm } from "./CreaClasseForm";

export const metadata = { title: `${it.creaClasse.titolo} — ${it.app.name}` };

export default function CreaClassePage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-[28px] font-bold">{it.creaClasse.titolo}</h1>
      <p className="mb-6 mt-1 text-ink-soft">{it.creaClasse.sottotitolo}</p>
      <CreaClasseForm />
    </div>
  );
}
