import { cn } from "@/lib/cn";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-xl border-2 border-line bg-paper px-4 py-3 text-[18px]",
        "placeholder:text-ink-soft/60 focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
