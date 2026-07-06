/**
 * Date in italiano leggibile ("venerdì 12 dicembre").
 * Logica pura: usabile sia lato server sia lato client.
 */

export function formatDateIt(iso: string, opts: { weekday?: boolean } = {}): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: opts.weekday === false ? undefined : "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatDateTimeIt(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDateIt(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
