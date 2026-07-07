// Passo 2: carica su Supabase l'anno generato dagli agenti
// (dati/mesi/*.json): post, sondaggi con opzioni e voti anonimi,
// richieste dei genitori. Tutto retrodatato: la bacheca ordina per
// created_at, quindi il risultato è indistinguibile da un anno vero.
//
// Prerequisito: 01-crea-classe.js già eseguito (serve registro-classe.json).
// Uso:         node scripts/simulazione/02-carica-anno.js
const fs = require("fs");
const path = require("path");
const {
  clientAdmin,
  leggiJson,
  scriviJson,
  leggiEnv,
  generaSlug,
  hashVotante,
  creaRng,
  CARTELLA_DATI,
} = require("./lib/comune");
const config = require("./config");

const rng = creaRng(config.SEME);

/** Ritardo di voto realistico in ore, in base al carattere del genitore. */
function ritardoVotoOre(prontezza) {
  if (prontezza === "subito") return 0.3 + rng() * 8;
  if (prontezza === "quasi-mai") return 72 + rng() * 96;
  return 24 + rng() * 72; // dopo-sollecito
}

function listaMesi() {
  const cartella = path.join(CARTELLA_DATI, "mesi");
  if (!fs.existsSync(cartella)) {
    console.error("Cartella dati/mesi mancante: prima genera i mesi con gli agenti.");
    process.exit(1);
  }
  return fs
    .readdirSync(cartella)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(cartella, f), "utf-8")));
}

async function main() {
  const admin = clientAdmin();
  const registro = leggiJson("registro-classe.json");
  const personas = leggiJson("personas.json");
  const env = leggiEnv();
  const baseUrl = env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const prontezzaDi = {};
  for (const g of personas.genitori) {
    prontezzaDi[g.id] = g.comportamento?.prontezzaVoto || "dopo-sollecito";
  }
  prontezzaDi[personas.rappresentante.id] = "subito";

  const repId = registro.utenti[personas.rappresentante.id];
  if (!repId) throw new Error("Rappresentante assente dal registro: rilancia 01.");

  // Guardia anti-doppio-caricamento.
  const { count } = await admin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("class_id", registro.classId);
  if (count > 0) {
    console.error(
      `La classe ha già ${count} post: anno già caricato.\n` +
        "Per ripartire: node scripts/simulazione/99-pulizia.js e poi 01, 02."
    );
    process.exit(1);
  }

  const mesi = listaMesi();
  console.log(`Mesi trovati: ${mesi.map((m) => m.mese).join(", ")}`);

  const slugUsati = new Set();
  const registroPost = {};
  let totPost = 0;
  let totVoti = 0;
  let totRichieste = 0;

  // --- Post (con sondaggi) mese per mese, in ordine cronologico.
  for (const mese of mesi) {
    for (const p of mese.post || []) {
      let slug = generaSlug(rng);
      while (slugUsati.has(slug)) slug = generaSlug(rng);
      slugUsati.add(slug);

      const archiviato = Boolean(p.archiviatoIl);
      const { data: riga, error } = await admin
        .from("posts")
        .insert({
          class_id: registro.classId,
          author_id: repId,
          type: p.tipo,
          slug,
          title: p.titolo,
          body: p.corpo || null,
          due_date: p.dueDate || null,
          // Stato FINALE in bacheca: un post archiviato non è mai fissato
          // (l'app toglie il pin quando archivia).
          pinned: Boolean(p.pinned) && !archiviato,
          archived: archiviato,
          created_at: p.creatoIl,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Post ${p.rif} fallito: ${error.message}`);
      totPost++;

      registroPost[p.rif] = {
        postId: riga.id,
        slug,
        url: `${baseUrl}/c/${registro.classCode}/p/${slug}`,
        tipo: p.tipo,
        titolo: p.titolo,
        corpo: p.corpo || null,
        creatoIl: p.creatoIl,
        archiviatoIl: p.archiviatoIl || null,
        pinned: Boolean(p.pinned),
        dueDate: p.dueDate || null,
        chiudeIl: p.sondaggio?.chiudeIl || null,
        opzioni: p.sondaggio?.opzioni || null,
        votiPerOpzione: p.sondaggio
          ? p.sondaggio.opzioni.map(
              (_, idx) =>
                (p.sondaggio.voti || []).filter((v) => v.opzioni.includes(idx)).length
            )
          : null,
      };

      // Sondaggio: dettaglio + opzioni + voti con hash anonimo identico
      // a cast_poll_vote (sha256 di "user_id:salt").
      if (p.tipo === "poll" && p.sondaggio) {
        const s = p.sondaggio;
        const { error: errPoll } = await admin
          .from("polls")
          .insert({ post_id: riga.id, closes_at: s.chiudeIl });
        if (errPoll) throw new Error(`Poll ${p.rif}: ${errPoll.message}`);

        const { data: opzioni, error: errOpt } = await admin
          .from("poll_options")
          .insert(s.opzioni.map((label, ord) => ({ post_id: riga.id, label, ord })))
          .select("id, ord");
        if (errOpt) throw new Error(`Opzioni ${p.rif}: ${errOpt.message}`);
        const opzionePerOrd = new Map(opzioni.map((o) => [o.ord, o.id]));

        // Il salt lo ha generato il database: si legge con la chiave admin
        // (i client normali non possono, la colonna è protetta).
        const { data: poll, error: errSalt } = await admin
          .from("polls")
          .select("salt")
          .eq("post_id", riga.id)
          .single();
        if (errSalt) throw new Error(`Salt ${p.rif}: ${errSalt.message}`);

        const chiusura = new Date(s.chiudeIl).getTime();
        const voti = [];
        for (const voto of s.voti || []) {
          const userId = registro.utenti[voto.persona];
          if (!userId) continue; // persona sconosciuta: si salta senza rompere
          let quando =
            new Date(p.creatoIl).getTime() +
            ritardoVotoOre(prontezzaDi[voto.persona]) * 3600 * 1000;
          if (quando >= chiusura) quando = chiusura - 30 * 60 * 1000;
          const hash = hashVotante(userId, poll.salt);
          for (const idx of voto.opzioni) {
            const optionId = opzionePerOrd.get(idx);
            if (!optionId) continue;
            voti.push({
              post_id: riga.id,
              option_id: optionId,
              voter_hash: hash,
              voted_at: new Date(quando).toISOString(),
            });
          }
        }
        if (voti.length > 0) {
          const { error: errVoti } = await admin.from("poll_votes").insert(voti);
          if (errVoti) throw new Error(`Voti ${p.rif}: ${errVoti.message}`);
          totVoti += voti.length;
        }
      }
    }
    console.log(`  ${mese.mese}: ${mese.post?.length || 0} post caricati`);
  }

  // --- Richieste dei genitori (dopo i post: alcune sono state convertite).
  for (const mese of mesi) {
    for (const r of mese.richieste || []) {
      const userId = registro.utenti[r.persona];
      if (!userId) continue;
      const stato = r.esito === "open" ? "open" : r.esito === "archived" ? "archived" : "handled";
      const { error } = await admin.from("requests").insert({
        class_id: registro.classId,
        author_id: userId,
        body: r.testo,
        status: r.convertitaIn ? "handled" : stato,
        converted_to_post_id: r.convertitaIn
          ? registroPost[r.convertitaIn]?.postId || null
          : null,
        created_at: r.creatoIl,
      });
      if (error) throw new Error(`Richiesta di ${r.persona}: ${error.message}`);
      totRichieste++;
    }
  }

  const file = scriviJson("registro-post.json", registroPost);
  console.log(`\nCaricati: ${totPost} post, ${totVoti} voti, ${totRichieste} richieste.`);
  console.log(`Registro post (rif → slug/url): ${file}`);
  console.log(`Bacheca: ${baseUrl}/c/${registro.classCode}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
