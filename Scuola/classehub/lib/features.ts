/**
 * Interruttori delle funzionalità (ADR-019).
 *
 * richieste — la zona "Richieste dei genitori" è DISABILITATA dal
 * 12/7/2026 (decisione di prodotto: il rappresentante scrive, i
 * genitori leggono; il testo libero resta su WhatsApp). Codice,
 * tabella `requests` e RLS restano al loro posto: per reintegrare
 * la funzione basta rimettere `true` qui e ricontrollare TEST_PLAN §7.
 */
export const FEATURES = {
  richieste: false,
} as const;
