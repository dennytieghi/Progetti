import { cn } from "@/lib/cn";

/** Banner informativo o di avvertimento (giallo = warning, blu = info). */
export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  children: React.ReactNode;
}) {
  const tones = {
    info: "bg-accent-light text-accent-dark border-accent/30",
    warning: "bg-warning-light text-warning border-warning/30",
    success: "bg-success-light text-success border-success/30",
    danger: "bg-danger-light text-danger border-danger/30",
  } as const;

  return (
    <div className={cn("rounded-xl border px-4 py-3 text-[17px]", tones[tone])}>
      {children}
    </div>
  );
}
