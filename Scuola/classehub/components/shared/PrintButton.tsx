"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" size="lg" onClick={() => window.print()}>
      <Printer className="size-5" aria-hidden /> {label}
    </Button>
  );
}
