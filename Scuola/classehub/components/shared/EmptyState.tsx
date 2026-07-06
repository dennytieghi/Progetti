/** Stato vuoto con frase utile (mai schermate bianche). */
export function EmptyState({
  emoji,
  title,
  text,
  children,
}: {
  emoji: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden>
        {emoji}
      </div>
      <h2 className="mb-1 text-[22px] font-semibold">{title}</h2>
      <p className="mx-auto mb-4 max-w-md text-ink-soft">{text}</p>
      {children}
    </div>
  );
}
