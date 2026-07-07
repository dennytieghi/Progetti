// Parametri fissi della simulazione "anno scolastico 2025/26".
module.exports = {
  // Codice classe fisso (usa solo caratteri dell'alfabeto consentito,
  // niente 0/O/1/I/l) così gli script sanno sempre quale classe è finta.
  CLASS_CODE: "TEST5B",
  CLASS_NAME: "5B Simulazione — Primaria G. Rodari",

  // Dominio email riservato ai profili finti: la pulizia cancella SOLO
  // gli utenti con questo dominio, mai account veri.
  EMAIL_DOMAIN: "simulazione.classehub.test",

  // Anno scolastico simulato (oggi è luglio 2026: l'anno è appena finito).
  ANNO: {
    creazioneClasse: "2025-09-08T18:30:00+02:00",
    primoGiornoScuola: "2025-09-15",
    ultimoGiornoScuola: "2026-06-06",
  },

  // Seme della casualità: cambialo per ottenere un anno diverso,
  // lascialo uguale per rigenerare esattamente lo stesso anno.
  SEME: 20252026,
};
