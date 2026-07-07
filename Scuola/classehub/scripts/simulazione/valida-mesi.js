// Controllo qualità dei file dati/mesi/*.json generati dagli agenti,
// PRIMA di caricarli su Supabase. Verifica schema, riferimenti e date;
// ripara da solo le cose sicure (id fatto duplicati tra mesi).
//
// Uso: node scripts/simulazione/valida-mesi.js [--correggi]
const fs = require("fs");
const path = require("path");
const { leggiJson, CARTELLA_DATI } = require("./lib/comune");

const TIPI = new Set(["notice", "deadline", "poll", "material"]);
const ESITI = new Set(["open", "handled", "archived"]);
const correggi = process.argv.includes("--correggi");

function main() {
  const personas = leggiJson("personas.json");
  const idPersone = new Set([
    personas.rappresentante.id,
    ...personas.genitori.map((g) => g.id),
  ]);
  const vietateInChat = new Set(["sconosciuto.rifiutato", "michele.ferri"]);
  const rep = personas.rappresentante.id;

  const cartella = path.join(CARTELLA_DATI, "mesi");
  const files = fs.readdirSync(cartella).filter((f) => f.endsWith(".json")).sort();
  let errori = 0;
  let avvisi = 0;
  const err = (msg) => {
    console.error(`  ERRORE  ${msg}`);
    errori++;
  };
  const avv = (msg) => {
    console.warn(`  avviso  ${msg}`);
    avvisi++;
  };

  const fattiVisti = new Map(); // id fatto → mese in cui è apparso
  const totali = { post: 0, chat: 0, richieste: 0, fatti: 0, voti: 0 };

  for (const nome of files) {
    const file = path.join(cartella, nome);
    console.log(`\n${nome}`);
    let mese;
    try {
      mese = JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch (e) {
      err(`JSON non valido: ${e.message}`);
      continue;
    }
    const prefisso = mese.mese; // "2025-09"
    let modificato = false;
    const rifPost = new Set();

    for (const p of mese.post || []) {
      totali.post++;
      if (rifPost.has(p.rif)) err(`rif post duplicato ${p.rif}`);
      rifPost.add(p.rif);
      if (!TIPI.has(p.tipo)) err(`${p.rif}: tipo sconosciuto "${p.tipo}"`);
      if (!p.titolo) err(`${p.rif}: titolo mancante`);
      if (!p.creatoIl || Number.isNaN(new Date(p.creatoIl).getTime()))
        err(`${p.rif}: creatoIl non valido`);
      else if (!p.creatoIl.startsWith(prefisso))
        avv(`${p.rif}: creatoIl ${p.creatoIl.slice(0, 10)} fuori dal mese`);
      if (p.tipo === "deadline" && !p.dueDate) err(`${p.rif}: deadline senza dueDate`);
      if (p.tipo === "poll") {
        if (!p.sondaggio?.opzioni?.length) err(`${p.rif}: poll senza opzioni`);
        if (!p.sondaggio?.chiudeIl) err(`${p.rif}: poll senza chiudeIl`);
        const votanti = new Set();
        for (const v of p.sondaggio?.voti || []) {
          totali.voti++;
          if (!idPersone.has(v.persona)) err(`${p.rif}: votante sconosciuto ${v.persona}`);
          if (votanti.has(v.persona)) err(`${p.rif}: doppio voto di ${v.persona}`);
          votanti.add(v.persona);
          const nOpzioni = p.sondaggio.opzioni.length;
          if (!Array.isArray(v.opzioni) || v.opzioni.some((i) => i < 0 || i >= nOpzioni))
            err(`${p.rif}: voto di ${v.persona} con indice opzione fuori range`);
        }
      }
      if (p.archiviatoIl && new Date(p.archiviatoIl) <= new Date(p.creatoIl))
        err(`${p.rif}: archiviato prima di essere creato`);
    }

    for (const m of mese.chat || []) {
      totali.chat++;
      if (!idPersone.has(m.persona)) err(`chat: persona sconosciuta ${m.persona}`);
      if (vietateInChat.has(m.persona)) err(`chat: ${m.persona} non può scrivere in chat`);
      if (!m.quando || Number.isNaN(new Date(m.quando).getTime()))
        err(`chat: data non valida "${m.quando}"`);
      if (m.rifPost && !rifPost.has(m.rifPost))
        err(`chat: rifPost ${m.rifPost} inesistente nel mese`);
      if (m.persona !== rep && m.rifPost && !(m.testo || "").trim())
        avv(`chat: citazione post senza testo da ${m.persona}`);
      if (m.persona === "irene.sala" && new Date(m.quando) < new Date("2025-11-10"))
        err(`chat: irene.sala scrive il ${m.quando} ma arriva il 10/11`);
    }

    for (const r of mese.richieste || []) {
      totali.richieste++;
      if (!idPersone.has(r.persona)) err(`richiesta: persona sconosciuta ${r.persona}`);
      if (r.persona === rep) err("richiesta: il rappresentante non manda richieste a sé stesso");
      if (!ESITI.has(r.esito)) err(`richiesta di ${r.persona}: esito "${r.esito}"`);
      if (r.convertitaIn && !rifPost.has(r.convertitaIn))
        err(`richiesta di ${r.persona}: convertitaIn ${r.convertitaIn} inesistente`);
    }

    for (const f of mese.fatti || []) {
      totali.fatti++;
      if (!f.id || !f.domanda || !f.risposta) err(`fatto incompleto: ${JSON.stringify(f).slice(0, 80)}`);
      if (f.rifPost && !rifPost.has(f.rifPost)) err(`fatto ${f.id}: rifPost ${f.rifPost} inesistente`);
      if (fattiVisti.has(f.id)) {
        const nuovo = `${f.id}--${prefisso}`;
        if (correggi) {
          console.log(`  riparo  fatto duplicato ${f.id} (già in ${fattiVisti.get(f.id)}) → ${nuovo}`);
          f.id = nuovo;
          modificato = true;
        } else {
          avv(`fatto ${f.id} già usato in ${fattiVisti.get(f.id)} (con --correggi lo rinomino)`);
        }
      }
      fattiVisti.set(f.id, prefisso);
    }

    if (modificato) {
      fs.writeFileSync(file, JSON.stringify(mese, null, 2) + "\n", "utf-8");
      console.log("  file aggiornato.");
    }
  }

  console.log(
    `\nTotali: ${files.length} mesi, ${totali.post} post, ${totali.chat} messaggi chat significativi, ` +
      `${totali.voti} voti, ${totali.richieste} richieste, ${totali.fatti} fatti.`
  );
  console.log(`Errori: ${errori} · Avvisi: ${avvisi}`);
  process.exit(errori > 0 ? 1 : 0);
}

main();
