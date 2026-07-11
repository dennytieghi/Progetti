/**
 * Normalizzazione delle coordinate di pagamento del rappresentante.
 * Logica pura: ritorna la forma canonica, o null se il valore non
 * è accettabile (il messaggio d'errore lo mette lo schema Zod).
 */

/** IBAN italiano: IT + 2 cifre controllo + CIN + ABI/CAB + conto. */
export function normalizzaIban(input: string): string | null {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  return /^IT\d{2}[A-Z]\d{10}[0-9A-Z]{12}$/.test(iban) ? iban : null;
}

/** Solo link paypal.me: qualunque altra cosa è rifiutata. */
export function normalizzaLinkPaypal(input: string): string | null {
  const s = input.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const m = s.match(/^paypal\.me\/([A-Za-z0-9]{1,50})\/?$/i);
  return m ? `https://paypal.me/${m[1]}` : null;
}

/** Cellulare italiano (Satispay è legato al numero di telefono). */
export function normalizzaTelefono(input: string): string | null {
  const t = input.replace(/[\s.\-/]/g, "");
  const m = t.match(/^(?:\+39)?(3\d{8,9})$/);
  return m ? `+39${m[1]}` : null;
}
