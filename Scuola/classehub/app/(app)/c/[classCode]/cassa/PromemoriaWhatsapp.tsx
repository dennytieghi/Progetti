"use client";

import { useState } from "react";
import { CopyButton } from "@/components/shared/CopyButton";
import { Textarea } from "@/components/ui/Textarea";
import { it } from "@/lib/i18n/it";

/**
 * Promemoria versamenti modificabile: il testo proposto è un punto di
 * partenza, il rappresentante lo ritocca e copia la SUA versione.
 * Le modifiche non vengono salvate: vivono solo fino al copia-incolla.
 */
export function PromemoriaWhatsapp({ defaultText }: { defaultText: string }) {
  const [text, setText] = useState(defaultText);

  return (
    <div className="space-y-3">
      <label htmlFor="promemoria-whatsapp" className="sr-only">
        {it.cassa.promemoriaTitolo}
      </label>
      <Textarea
        id="promemoria-whatsapp"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={1000}
        className="text-[16px]"
      />
      <CopyButton text={text} />
    </div>
  );
}
