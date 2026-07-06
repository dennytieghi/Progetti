import { cn } from "@/lib/cn";

/** Input con altezza ≥48px e testo grande (leggibilità 50-60enni). */
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-xl border-2 border-line bg-paper px-4 text-[18px]",
        "placeholder:text-ink-soft/60 focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
