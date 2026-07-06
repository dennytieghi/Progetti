"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "./Button";
import { it } from "@/lib/i18n/it";

/**
 * Bottone di submit con spinner durante l'invio
 * (feedback funzionale, unica animazione ammessa).
 */
export function SubmitButton({
  children,
  variant = "primary",
  size = "lg",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-5 animate-spin" aria-hidden />
          {it.common.caricamento}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
