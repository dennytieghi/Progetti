"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { it } from "@/lib/i18n/it";

/** Pulsante "Copia per WhatsApp" (ADR-002). */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback per browser vecchi: selezione manuale del testo.
      window.prompt(it.common.copiaWhatsapp, text);
    }
  }

  return (
    <Button type="button" size="lg" onClick={handleCopy} aria-live="polite">
      {copied ? (
        <>
          <Check className="size-5" aria-hidden /> {it.common.copiato}
        </>
      ) : (
        <>
          <Copy className="size-5" aria-hidden /> 📋 {it.common.copiaWhatsapp}
        </>
      )}
    </Button>
  );
}
