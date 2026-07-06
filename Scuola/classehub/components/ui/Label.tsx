import { cn } from "@/lib/cn";

/** Label sempre sopra l'input (mai solo placeholder — UX_PRINCIPLES). */
export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block font-semibold text-ink", className)}
      {...props}
    />
  );
}
