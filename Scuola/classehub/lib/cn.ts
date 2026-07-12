/**
 * Unisce classi CSS ignorando i valori falsy (mini-clsx senza dipendenze).
 * ATTENZIONE: non risolve i conflitti Tailwind (niente tailwind-merge):
 * se due classi impostano la stessa proprietà (es. bg-paper + bg-accent-light),
 * vince quella che compare dopo nel CSS compilato, non nell'ordine qui.
 * Per sovrascrivere lo sfondo di un componente come Card, usa un div dedicato.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
