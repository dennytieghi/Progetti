// Passo 4b: gli STRUMENTI del genitore-cercatore. L'agente valutatore può
// fare SOLO quello che farebbe una persona vera con telefono in mano:
//   cerca    → la lente di WhatsApp (parole chiave sulla chat fino alla data D)
//   scorri   → scorrere la chat all'indietro dalla data D
//   contesto → leggere i messaggi attorno a un risultato
//   apri     → aprire un link ClasseHub trovato in chat (o uno slug)
//   bacheca  → aprire l'app e guardare la bacheca com'era alla data D
//
// Ogni chiamata viene REGISTRATA in uscite/valutazione/log/<id>.jsonl:
// da lì lo script del punteggio calcola le componenti meccaniche dello score.
//
// Uso: node scripts/simulazione/04-strumenti.js <azione> --sondaggio s01 [opzioni]
const fs = require("fs");
const path = require("path");
const { leggiJson } = require("./lib/comune");
const { bachecaAllaData, prossimeScadenze, statoPostAllaData } = require("./lib/stato-bacheca");

const USCITE = path.join(__dirname, "uscite");

function argomenti() {
  const [azione, ...resto] = process.argv.slice(2);
  const opz = {};
  for (let i = 0; i < resto.length; i += 2) {
    if (resto[i]?.startsWith("--")) opz[resto[i].slice(2)] = resto[i + 1];
  }
  return { azione, opz };
}

function caricaChat() {
  const file = path.join(USCITE, "chat-whatsapp.jsonl");
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((r, i) => ({ indice: i, ...JSON.parse(r) }));
}

function registraLog(sondaggioId, voce) {
  const cartella = path.join(USCITE, "valutazione", "log");
  fs.mkdirSync(cartella, { recursive: true });
  fs.appendFileSync(
    path.join(cartella, `${sondaggioId}.jsonl`),
    JSON.stringify({ ...voce, ts: new Date().toISOString() }) + "\n",
    "utf-8"
  );
}

function stampaMessaggio(m) {
  const quando = m.quando.slice(0, 16).replace("T", " ");
  const testo = m.testo.length > 220 ? m.testo.slice(0, 220) + "…" : m.testo;
  console.log(`[#${m.indice}] ${quando} — ${m.nome}:\n${testo}\n`);
}

function main() {
  const { azione, opz } = argomenti();
  if (!azione || !opz.sondaggio) {
    console.error(
      "Uso: node 04-strumenti.js <cerca|scorri|contesto|apri|bacheca> --sondaggio <id> [opzioni]"
    );
    process.exit(1);
  }

  const sondaggi = JSON.parse(
    fs.readFileSync(path.join(USCITE, "valutazione", "sondaggi.json"), "utf-8")
  );
  const sondaggio = sondaggi.find((s) => s.id === opz.sondaggio);
  if (!sondaggio) {
    console.error(`Sondaggio ${opz.sondaggio} inesistente.`);
    process.exit(1);
  }
  const dMs = new Date(sondaggio.dataD).getTime();
  const registroPost = leggiJson("registro-post.json");

  // ------------------------------------------------------------ CERCA
  if (azione === "cerca") {
    const chiave = (opz.testo || "").toLowerCase();
    if (!chiave) {
      console.error("Serve --testo <parole>");
      process.exit(1);
    }
    const chat = caricaChat().filter((m) => new Date(m.quando).getTime() <= dMs);
    const trovati = chat
      .filter((m) => (m.nome + " " + m.testo).toLowerCase().includes(chiave))
      .reverse() // come WhatsApp: dal più recente
      .slice(0, 15);
    registraLog(sondaggio.id, {
      azione: "cerca",
      testo: opz.testo,
      risultati: trovati.length,
      indici: trovati.map((m) => m.indice),
    });
    console.log(`Ricerca "${opz.testo}" fino al ${sondaggio.dataD.slice(0, 10)}: ${trovati.length} risultati (max 15, dal più recente)\n`);
    for (const m of trovati) stampaMessaggio(m);
    return;
  }

  // ------------------------------------------------------------ SCORRI
  if (azione === "scorri") {
    const daMs = opz.da ? new Date(opz.da).getTime() : dMs;
    const quanti = Math.min(Number(opz.quanti || 25), 50);
    const chat = caricaChat().filter((m) => new Date(m.quando).getTime() <= Math.min(daMs, dMs));
    const fetta = chat.slice(-quanti);
    registraLog(sondaggio.id, { azione: "scorri", da: opz.da || sondaggio.dataD, quanti: fetta.length });
    console.log(`Ultimi ${fetta.length} messaggi prima di ${new Date(Math.min(daMs, dMs)).toISOString().slice(0, 16)}\n`);
    for (const m of fetta) stampaMessaggio(m);
    return;
  }

  // ------------------------------------------------------------ CONTESTO
  if (azione === "contesto") {
    const indice = Number(opz.indice);
    const prima = Math.min(Number(opz.prima || 8), 25);
    const dopo = Math.min(Number(opz.dopo || 4), 25);
    const chat = caricaChat().filter((m) => new Date(m.quando).getTime() <= dMs);
    const posizione = chat.findIndex((m) => m.indice === indice);
    if (posizione === -1) {
      console.error("Indice fuori dalla chat visibile a questa data.");
      process.exit(1);
    }
    const fetta = chat.slice(Math.max(0, posizione - prima), posizione + dopo + 1);
    registraLog(sondaggio.id, { azione: "contesto", indice, quanti: fetta.length });
    for (const m of fetta) stampaMessaggio(m);
    return;
  }

  // ------------------------------------------------------------ APRI
  if (azione === "apri") {
    const link = opz.link || "";
    const slug = link.includes("/p/") ? link.split("/p/")[1].split(/[?#\s]/)[0] : link.trim();
    const voce = Object.entries(registroPost).find(([, p]) => p.slug === slug);
    if (!voce) {
      registraLog(sondaggio.id, { azione: "apri", slug, esito: "non-trovato" });
      console.log("Questo link non porta a nessun post. Controlla di averlo copiato intero.");
      return;
    }
    const [rif, post] = voce;
    const stato = statoPostAllaData(post, dMs);
    if (!stato) {
      registraLog(sondaggio.id, { azione: "apri", slug, esito: "non-ancora-pubblicato" });
      console.log("Alla data del sondaggio questo post non esisteva ancora.");
      return;
    }
    const posizione = bachecaAllaData(registroPost, dMs).find((p) => p.rif === rif)?.posizione ?? null;
    registraLog(sondaggio.id, { azione: "apri", slug, rif, esito: "ok", archiviato: stato.archiviatoAllaData, posizione });
    console.log(`── ${post.titolo} ──`);
    console.log(`Tipo: ${post.tipo}${stato.pinnedAllaData ? " · FISSATO IN ALTO" : ""}${stato.archiviatoAllaData ? " · ARCHIVIATO" : ""}`);
    console.log(`Pubblicato il: ${post.creatoIl.slice(0, 10)}`);
    if (post.dueDate) console.log(`Entro: ${post.dueDate.slice(0, 10)}`);
    if (post.corpo) console.log(`\n${post.corpo}`);
    if (post.opzioni) {
      const chiuso = post.chiudeIl && new Date(post.chiudeIl).getTime() <= dMs;
      console.log(`\nSondaggio (${chiuso ? "chiuso" : "aperto, si vota fino al " + post.chiudeIl.slice(0, 10)}):`);
      post.opzioni.forEach((o, i) => {
        const voti = chiuso && post.votiPerOpzione ? ` — ${post.votiPerOpzione[i]} voti` : "";
        console.log(`  ${i + 1}. ${o}${voti}`);
      });
    }
    return;
  }

  // ------------------------------------------------------------ BACHECA
  if (azione === "bacheca") {
    const pagina = Math.max(1, Number(opz.pagina || 1));
    const perPagina = 10;
    const scadenze = prossimeScadenze(registroPost, dMs);
    const tutti = bachecaAllaData(registroPost, dMs);
    const fetta = tutti.slice((pagina - 1) * perPagina, pagina * perPagina);
    registraLog(sondaggio.id, { azione: "bacheca", pagina, totale: tutti.length });
    console.log(`BACHECA 5B alla data ${sondaggio.dataD.slice(0, 10)} — ${tutti.length} post attivi\n`);
    if (pagina === 1 && scadenze.length) {
      console.log("PROSSIME SCADENZE:");
      for (const s of scadenze) console.log(`  ⏰ ${s.quando.slice(0, 10)} — ${s.titolo} [slug ${s.slug}]`);
      console.log("");
    }
    console.log(`Post (pagina ${pagina} di ${Math.ceil(tutti.length / perPagina)}):`);
    for (const p of fetta) {
      console.log(`  ${p.posizione}. ${p.pinnedAllaData ? "📌 " : ""}[${p.tipo}] ${p.titolo} — ${p.creatoIl.slice(0, 10)} [slug ${p.slug}]`);
    }
    return;
  }

  console.error(`Azione sconosciuta: ${azione}`);
  process.exit(1);
}

main();
