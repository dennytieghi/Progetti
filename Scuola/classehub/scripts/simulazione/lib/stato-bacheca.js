// Ricostruisce lo stato della bacheca ClasseHub a una data D passata:
// stesso ordinamento dell'app (fissati in alto, poi i più recenti) e
// stessa sezione "Prossime scadenze". Serve al valutatore per capire
// "quanto in basso" stava un'informazione quel giorno.

/** Un post è fissato dalla pubblicazione fino a quando viene archiviato. */
function statoPostAllaData(post, dMs) {
  const creato = new Date(post.creatoIl).getTime();
  if (creato > dMs) return null; // non esisteva ancora
  const archiviato = post.archiviatoIl && new Date(post.archiviatoIl).getTime() <= dMs;
  return {
    ...post,
    archiviatoAllaData: Boolean(archiviato),
    pinnedAllaData: Boolean(post.pinned) && !archiviato,
  };
}

/** Bacheca alla data D: [{posizione, rif, …}] esclusi gli archiviati. */
function bachecaAllaData(registroPost, dMs) {
  const visibili = [];
  for (const [rif, post] of Object.entries(registroPost)) {
    const stato = statoPostAllaData(post, dMs);
    if (stato && !stato.archiviatoAllaData) visibili.push({ rif, ...stato });
  }
  visibili.sort((a, b) => {
    if (a.pinnedAllaData !== b.pinnedAllaData) return a.pinnedAllaData ? -1 : 1;
    return new Date(b.creatoIl) - new Date(a.creatoIl);
  });
  return visibili.map((p, i) => ({ posizione: i + 1, ...p }));
}

/** Sezione "Prossime scadenze" alla data D (deadline e sondaggi aperti). */
function prossimeScadenze(registroPost, dMs) {
  const rilevanti = [];
  for (const [rif, post] of Object.entries(registroPost)) {
    const stato = statoPostAllaData(post, dMs);
    if (!stato || stato.archiviatoAllaData) continue;
    const quando = post.dueDate || post.chiudeIl;
    if (!quando) continue;
    const t = new Date(quando).getTime();
    if (t >= dMs) rilevanti.push({ rif, quando, ...stato });
  }
  rilevanti.sort((a, b) => new Date(a.quando) - new Date(b.quando));
  return rilevanti.slice(0, 5);
}

module.exports = { statoPostAllaData, bachecaAllaData, prossimeScadenze };
