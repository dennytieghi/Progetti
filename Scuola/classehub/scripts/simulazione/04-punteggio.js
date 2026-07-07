// Passo 4d: calcola lo score dei sondaggi di reperibilità.
// Combina:
//   - componenti MECCANICHE (dai log degli strumenti: nessun giudizio del
//     modello, solo numeri): trovabilità in chat, ponte chat→app,
//     trovabilità in bacheca
//   - componente di CORRETTEZZA (dal giudice, uscite/valutazione/giudizi.json)
// Formula documentata in SIMULAZIONE.md §Algoritmo di score.
//
// Prerequisiti: log/ e risposte/ scritti dagli agenti cercatori,
//               giudizi.json scritto dall'agente giudice.
// Uso: node scripts/simulazione/04-punteggio.js
const fs = require("fs");
const path = require("path");
const { leggiJson } = require("./lib/comune");
const { bachecaAllaData, prossimeScadenze, statoPostAllaData } = require("./lib/stato-bacheca");

const VAL = path.join(__dirname, "uscite", "valutazione");

function caricaChat() {
  return fs
    .readFileSync(path.join(__dirname, "uscite", "chat-whatsapp.jsonl"), "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((r, i) => ({ indice: i, ...JSON.parse(r) }));
}

function leggiLog(id) {
  const file = path.join(VAL, "log", `${id}.jsonl`);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf-8").split("\n").filter(Boolean).map((r) => JSON.parse(r));
}

/** Il messaggio è "pertinente" se punta a un post della catena del fatto. */
function pertinente(msg, verita) {
  if (msg.rifPost && verita.catenaRif.includes(msg.rifPost)) return true;
  return verita.catenaSlug.some((slug) => msg.testo.includes(`/p/${slug}`));
}

// ---------------------------------------------------------------- componenti

/** C1 (0-30): quanto è stato facile trovare il filo giusto nella chat. */
function scoreChat(log, verita, chat, risposta) {
  const perIndice = new Map(chat.map((m) => [m.indice, m]));
  const ricerche = log.filter((v) => v.azione === "cerca");
  for (const ricerca of ricerche) {
    const rank = (ricerca.indici || []).findIndex((i) => {
      const m = perIndice.get(i);
      return m && pertinente(m, verita);
    });
    if (rank === 0) return 30;
    if (rank === 1) return 24;
    if (rank === 2) return 18;
    if (rank >= 3 && rank <= 4) return 12;
    if (rank > 4) return 8;
  }
  // Nessuna ricerca andata a segno: ha scrollato?
  const scrollati = log
    .filter((v) => v.azione === "scorri" || v.azione === "contesto")
    .reduce((somma, v) => somma + (v.quanti || 0), 0);
  const trovato = risposta?.comeTrovata && risposta.comeTrovata !== "non-trovata";
  if (scrollati > 0 && trovato && (risposta.comeTrovata || "").startsWith("chat")) {
    return Math.round(30 * Math.max(0, 1 - scrollati / 300) * 0.5);
  }
  // È andato dritto in bacheca senza passare dalla chat e ha risolto:
  // la chat non è servita, e questo per l'app è un successo, non un fallimento.
  const soloApp = ricerche.length === 0 && scrollati === 0;
  if (soloApp && trovato) return 24;
  return 0;
}

/** C2 (0-20): il ponte chat→app: ha aperto il post GIUSTO? */
function scorePonte(log, verita, risposta) {
  const aperture = log.filter((v) => v.azione === "apri" && v.esito === "ok");
  if (aperture.some((v) => v.slug === verita.slug)) return 20;
  if (aperture.some((v) => verita.catenaSlug.includes(v.slug))) return 8; // versione vecchia
  const trovato = risposta?.comeTrovata && risposta.comeTrovata !== "non-trovata";
  if (trovato) return 6; // risposta pescata dal testo della chat, senza app
  return 0;
}

/** C3 (0-30): dove stava l'informazione in bacheca quel giorno (proprietà
 * dell'app, indipendente dall'abilità del cercatore). */
function scoreBacheca(verita, registroPost, dMs) {
  const post = registroPost[verita.rifPost];
  if (!post) return 0;
  const stato = statoPostAllaData(post, dMs);
  if (!stato) return 0;
  if (stato.pinnedAllaData) return 30;
  if (prossimeScadenze(registroPost, dMs).some((s) => s.rif === verita.rifPost)) return 30;
  if (stato.archiviatoAllaData) return 6;
  const posizione = bachecaAllaData(registroPost, dMs).find(
    (p) => p.slug === post.slug
  )?.posizione;
  if (!posizione) return 0;
  if (posizione <= 5) return 26;
  if (posizione <= 15) return 18;
  return Math.max(4, 18 - (posizione - 15));
}

// ---------------------------------------------------------------- main

function main() {
  const sondaggi = JSON.parse(fs.readFileSync(path.join(VAL, "sondaggi.json"), "utf-8"));
  const verita = JSON.parse(fs.readFileSync(path.join(VAL, "verita.json"), "utf-8"));
  const giudizi = fs.existsSync(path.join(VAL, "giudizi.json"))
    ? JSON.parse(fs.readFileSync(path.join(VAL, "giudizi.json"), "utf-8"))
    : {};
  const registroPost = leggiJson("registro-post.json");
  const chat = caricaChat();

  const risultati = [];
  for (const s of sondaggi) {
    const v = verita[s.id];
    const log = leggiLog(s.id);
    const fileRisposta = path.join(VAL, "risposte", `${s.id}.json`);
    const risposta = fs.existsSync(fileRisposta)
      ? JSON.parse(fs.readFileSync(fileRisposta, "utf-8"))
      : null;
    const dMs = new Date(s.dataD).getTime();

    const c1 = scoreChat(log, v, chat, risposta);
    const c2 = scorePonte(log, v, risposta);
    const c3 = scoreBacheca(v, registroPost, dMs);
    const c4 = Math.max(0, Math.min(20, giudizi[s.id]?.punteggio ?? 0));

    risultati.push({
      id: s.id,
      domanda: s.domanda,
      dataD: s.dataD,
      mese: s.dataD.slice(0, 7),
      componenti: { chat: c1, ponte: c2, bacheca: c3, correttezza: c4 },
      totale: c1 + c2 + c3 + c4,
      comeTrovata: risposta?.comeTrovata || "nessuna-risposta",
      difficoltaPercepita: risposta?.difficolta ?? null,
      note: risposta?.note || null,
      motivoGiudice: giudizi[s.id]?.motivo || null,
    });
  }

  // Aggregati.
  const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const perMese = {};
  for (const r of risultati) {
    (perMese[r.mese] = perMese[r.mese] || []).push(r.totale);
  }
  const conApp = risultati.filter((r) => ["chat-link", "bacheca", "scadenze"].includes(r.comeTrovata));
  const senzaApp = risultati.filter((r) => r.comeTrovata === "chat-testo");
  const report = {
    generatoIl: new Date().toISOString(),
    sondaggi: risultati.length,
    scoreMedio: Math.round(media(risultati.map((r) => r.totale)) * 10) / 10,
    componentiMedie: {
      chat: Math.round(media(risultati.map((r) => r.componenti.chat)) * 10) / 10,
      ponte: Math.round(media(risultati.map((r) => r.componenti.ponte)) * 10) / 10,
      bacheca: Math.round(media(risultati.map((r) => r.componenti.bacheca)) * 10) / 10,
      correttezza: Math.round(media(risultati.map((r) => r.componenti.correttezza)) * 10) / 10,
    },
    tassoRispostaCorretta:
      Math.round(
        (risultati.filter((r) => r.componenti.correttezza >= 10).length / risultati.length) * 100
      ) + "%",
    scorePerMese: Object.fromEntries(
      Object.entries(perMese)
        .sort()
        .map(([m, tot]) => [m, Math.round(media(tot) * 10) / 10])
    ),
    confrontoCanale: {
      viaApp: { quanti: conApp.length, scoreMedio: Math.round(media(conApp.map((r) => r.totale)) * 10) / 10, correttezzaMedia: Math.round(media(conApp.map((r) => r.componenti.correttezza)) * 10) / 10 },
      soloChat: { quanti: senzaApp.length, scoreMedio: Math.round(media(senzaApp.map((r) => r.totale)) * 10) / 10, correttezzaMedia: Math.round(media(senzaApp.map((r) => r.componenti.correttezza)) * 10) / 10 },
    },
    casiPeggiori: [...risultati].sort((a, b) => a.totale - b.totale).slice(0, 5),
    dettaglio: risultati,
  };

  fs.writeFileSync(path.join(VAL, "report.json"), JSON.stringify(report, null, 2), "utf-8");
  console.log(`Sondaggi valutati: ${risultati.length}`);
  console.log(`Score medio: ${report.scoreMedio}/100  (chat ${report.componentiMedie.chat}/30 · ponte ${report.componentiMedie.ponte}/20 · bacheca ${report.componentiMedie.bacheca}/30 · correttezza ${report.componentiMedie.correttezza}/20)`);
  console.log(`Risposte corrette: ${report.tassoRispostaCorretta}`);
  console.log("Score per mese:", report.scorePerMese);
  console.log("\nReport completo: uscite/valutazione/report.json");
}

main();
