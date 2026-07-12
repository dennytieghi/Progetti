"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { it } from "@/lib/i18n/it";

/**
 * Pulsante di copia con conferma "Copiato!". Default: il pulsantone
 * "Copia per WhatsApp" dei post (ADR-002); con label/variant/size si
 * adatta ai contesti compatti (es. IBAN in cassa: solo "Copia").
 */
export function CopyButton({
  text,
  label = it.common.copiaWhatsapp,
  variant = "primary",
  size = "lg",
}: {
  text: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback per browser vecchi: selezione manuale del testo.
      window.prompt(label, text);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleCopy} aria-live="polite">
      {copied ? (
        <>
          <Check className="size-5" aria-hidden /> {it.common.copiato}
        </>
      ) : (
        <>
          <Copy className="size-5" aria-hidden /> {label}
        </>
      )}
    </Button>
  );
}
