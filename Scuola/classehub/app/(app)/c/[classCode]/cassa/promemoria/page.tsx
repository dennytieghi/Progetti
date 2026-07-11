import { requireRepresentative } from "@/lib/auth/require-membership";
import { formatCassaReminderForWhatsapp } from "@/lib/whatsapp/format-message";
import { getBaseUrl } from "@/lib/base-url";
import { it } from "@/lib/i18n/it";
import { PromemoriaWhatsapp } from "../PromemoriaWhatsapp";

export const metadata = { title: `${it.cassa.promemoriaTitolo} — ${it.app.name}` };

export default async function PromemoriaPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  const ctx = await requireRepresentative(classCode);

  const testo = formatCassaReminderForWhatsapp({
    classCode: ctx.klass.class_code,
    className: ctx.klass.name,
    baseUrl: await getBaseUrl(),
    coords: {
      iban: ctx.klass.payment_iban,
      ibanHolder: ctx.klass.payment_iban_holder,
      paypal: ctx.klass.payment_paypal,
      satispay: ctx.klass.payment_satispay,
    },
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[28px] font-bold">{it.cassa.promemoriaTitolo}</h1>
        <p className="mt-1 text-ink-soft">{it.cassa.promemoriaSpiega}</p>
      </div>
      <PromemoriaWhatsapp defaultText={testo} />
    </div>
  );
}
