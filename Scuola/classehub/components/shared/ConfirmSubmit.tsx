"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Conferma per azioni distruttive: modal con "Sì, …" / "No, torna indietro"
 * (UX_PRINCIPLES: mai OK/Cancel). Avvolge una Server Action.
 */
export function ConfirmSubmit({
  action,
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "danger" | "secondary" | "primary";
  /** Campi extra del form (es. textarea del motivo di rifiuto). */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="w-full max-w-md rounded-2xl bg-paper p-6 shadow-lg">
            <h2 className="mb-2 text-[22px] font-semibold">{title}</h2>
            <p className="mb-5 text-ink-soft">{description}</p>
            <form action={action} className="space-y-4">
              {children}
              <div className="flex flex-col gap-3">
                <Button type="submit" variant={variant} size="lg">
                  {confirmLabel}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setOpen(false)}
                >
                  {cancelLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
