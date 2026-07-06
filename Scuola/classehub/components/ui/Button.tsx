import { cn } from "@/lib/cn";

/**
 * Bottoni con touch target ≥48px (UX_PRINCIPLES §interazione).
 * `buttonClasses` è esportata per stilizzare i <Link> come bottoni.
 */

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold " +
  "transition-colors disabled:pointer-events-none disabled:opacity-60 " +
  "cursor-pointer text-center";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  secondary: "border-2 border-line bg-paper text-ink hover:border-ink-soft",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-accent hover:bg-accent-light",
};

const SIZES: Record<Size, string> = {
  md: "min-h-12 px-5",
  lg: "min-h-14 w-full px-6 text-[18px]",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
