// Passo 3: costruisce la chat WhatsApp dell'anno intero.
//   - messaggi SIGNIFICATIVI: scritti dagli agenti nei file dati/mesi/*.json
//   - messaggi di CONDIVISIONE post: replicano ESATTAMENTE il testo del
//     pulsante "Copia per WhatsApp" dell'app (lib/whatsapp/format-message.ts)
//     con i link reali generati dal passo 2
//   - RUMORE: grazie/ok a catena, buongiorno, auguri, catene — generato da
//     template per persona fino ai volumi target del calendario (la ricerca
//     dice: 60-80% del volume è rumore, ed è ripetitivo per natura)
//
// Output: uscite/chat-whatsapp.jsonl, uscite/chat-whatsapp.html,
//         uscite/statistiche-chat.json
//
// Prerequisito: 02-carica-anno.js (serve registro-post.json con gli url).
// Uso:          node scripts/simulazione/03-chat-whatsapp.js
const fs = require("fs");
const path = require("path");
const { leggiJson, creaRng, CARTELLA_DATI } = require("./lib/comune");
const config = require("./config");

const rng = creaRng(config.SEME + 1);
const scegli = (arr) => arr[Math.floor(rng() * arr.length)];

// ---------------------------------------------------------------- formato app
// Replica di formatPostForWhatsapp + formatDateIt (stesse etichette di
// lib/i18n/it.ts): il messaggio in chat deve essere identico a quello
// che il rappresentante copia dall'app.
const EMOJI_TIPO = { notice: "📢", deadline: "⏰", poll: "🗳️", material: "📎" };
const LABEL_TIPO = { notice: "AVVISO", deadline: "SCADENZA", poll: "SONDAGGIO", material: "MATERIALE" };

function formatDateIt(iso) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function testoCondivisione(post) {
  const righe = [`${EMOJI_TIPO[post.tipo]} ${LABEL_TIPO[post.tipo]} — ${post.titolo}`];
  if (post.tipo === "deadline" && post.dueDate) {
    righe.push(`📅 Entro ${formatDateIt(post.dueDate)}`);
  }
  if (post.tipo === "poll" && post.chiudeIl) {
    righe.push(`📅 Puoi votare fino a ${formatDateIt(post.chiudeIl)}`);
  }
  righe.push(post.tipo === "poll" ? "Vota qui:" : "Dettagli e come procedere:");
  righe.push(`👉 ${post.url}`);
  return righe.join("\n");
}

// ---------------------------------------------------------------- template rumore
// Tono per archetipo: il rumore vero è ripetitivo, ma ognuno ha il suo stile.
const TONO = {
  "nonna-delegata": {
    reazioni: ["GRAZIE MILLE 🙏🙏🌸", "Grazie cara 🌷", "SEMPRE GENTILISSIMA GRAZIE ❤️", "🙏🙏🙏"],
    buongiorno: ["BUONGIORNO A TUTTI ☀️🌸 BUONA GIORNATA", "Buongiorno care mamme e papà 🌷☕", "BUONA DOMENICA A TUTTE LE FAMIGLIE 🌈🙏"],
    auguri: ["TANTI AUGURI TESORO 🎂🎉❤️", "AUGURONI DALLA NONNA DI AURORA 🎈🎂"],
  },
  "low-tech": {
    reazioni: ["Grazie mille, gentilissima.", "Ricevuto, grazie.", "Va bene, grazie dell'informazione."],
    auguri: ["Tanti auguri al festeggiato da parte nostra.", "Auguri anche da Marco e famiglia."],
  },
  "buongiornista-offtopic": {
    reazioni: ["👍", "ok grazie capo 😄", "ricevuto!", "top 👌"],
    buongiorno: ["Buongiorno popolo della 5B! ☕", "buongiornooo ☀️", "Buon lunedì ragazzi 💪"],
    auguri: ["Auguriii 🎉🎂🥳", "auguri campione! 🎈"],
  },
  "mamma-social": {
    reazioni: ["Grazie!! ❤️", "Perfetto grazie mille 😘", "Top!! 🙌", "Grazie Denise sei un mito ⭐"],
    buongiorno: ["Buonanotte a tutti 🌙✨"],
    auguri: ["Auguriiiii amore!! 🎂🎉💖", "Tanti auguri piccolo!! 🥳🎈🎈"],
  },
  frettolosa: {
    reazioni: ["ok grz", "ok x me", "👍", "ricevuto grz"],
    auguri: ["auguri!! 🎂"],
  },
  ansiosa: {
    reazioni: ["Grazie! Quindi confermato giusto?", "Ok grazie, segnato!", "Grazie ❤️ meno male"],
    auguri: ["Tanti auguri!! 🎂🎉"],
  },
  polemico: { reazioni: ["Ok.", "Va bene.", "Preso nota."], auguri: ["Auguri."] },
  prolisso: {
    reazioni: ["Grazie Denise, come sempre puntualissima e precisa, senza di te saremmo persi.", "Ricevuto e preso nota, grazie davvero."],
    auguri: ["Tantissimi auguri al festeggiato, che sia una giornata bellissima, e complimenti anche ai genitori per l'organizzazione."],
  },
  neutro: {
    reazioni: ["Grazie!", "Ok grazie", "👍", "Perfetto", "Grazie mille", "Ok!", "Ricevuto"],
    auguri: ["Tanti auguri!! 🎂", "Auguri!! 🎉", "Auguroni! 🥳"],
  },
};

function tonoDi(persona) {
  return TONO[persona.archetipo] || TONO.neutro;
}

// ---------------------------------------------------------------- utilità date
const MS_ORA = 3600 * 1000;

function iso(ts) {
  return new Date(ts).toISOString();
}

function giorniScuola(calendario) {
  const inizio = new Date(calendario.annoScolastico.inizio + "T00:00:00");
  const fine = new Date(calendario.annoScolastico.fine + "T00:00:00");
  const vacanze = calendario.annoScolastico.vacanze.map((v) => [
    new Date(v.dal + "T00:00:00").getTime(),
    new Date(v.al + "T23:59:59").getTime(),
  ]);
  const giorni = [];
  for (let d = new Date(inizio); d <= fine; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // niente scuola sabato/domenica
    const t = d.getTime();
    if (vacanze.some(([a, b]) => t >= a && t <= b)) continue;
    giorni.push(new Date(d));
  }
  return giorni;
}

async function main() {
  const personas = leggiJson("personas.json");
  const calendario = leggiJson("calendario.json");
  const registroPost = leggiJson("registro-post.json");

  const tutte = [personas.rappresentante, ...personas.genitori];
  const personaDi = new Map(tutte.map((p) => [p.id, p]));
  // In chat scrive solo chi è nel gruppo: gli esclusi hanno messaggiSettimana 0.
  const nelGruppo = tutte.filter((p) => (p.comportamento?.messaggiSettimana ?? 1) > 0);
  const attivaDa = (p) => new Date(`${p.iscrittoIl}T00:00:00`).getTime();

  const messaggi = []; // {quando(ms), persona, testo, rifPost, rumore}
  const aggiungi = (quandoMs, personaId, testo, rifPost = null, rumore = false) => {
    messaggi.push({ quando: quandoMs, persona: personaId, testo, rifPost, rumore });
  };

  // --- 1. Messaggi significativi dagli agenti (con link reali).
  const cartellaMesi = path.join(CARTELLA_DATI, "mesi");
  const fileMesi = fs.readdirSync(cartellaMesi).filter((f) => f.endsWith(".json")).sort();
  const ancore = []; // condivisioni e annunci: attirano le reazioni-rumore
  const targetMese = {}; // "2025-09" → totale desiderato

  for (const nomeFile of fileMesi) {
    const mese = JSON.parse(fs.readFileSync(path.join(cartellaMesi, nomeFile), "utf-8"));
    targetMese[mese.mese] = calendario.volumiMensili[mese.mese]?.chatTotaleCirca || 0;
    for (const m of mese.chat || []) {
      const quando = new Date(m.quando).getTime();
      if (Number.isNaN(quando)) continue;
      let testo = m.testo || "";
      if (m.rifPost && registroPost[m.rifPost]) {
        const post = registroPost[m.rifPost];
        if (m.persona === personas.rappresentante.id && testo.trim() === "") {
          testo = testoCondivisione(post); // identico al pulsante Copia dell'app
          ancore.push({ quando, mese: mese.mese });
        } else {
          testo = `${testo}\n👉 ${post.url}`.trim();
        }
      }
      if (!testo) continue;
      aggiungi(quando, m.persona, testo, m.rifPost || null, false);
    }
  }

  // --- 2. Rumore: reazioni a catena dopo ogni condivisione.
  for (const a of ancore) {
    for (const p of nelGruppo) {
      if (a.quando < attivaDa(p)) continue;
      const prob = (p.comportamento?.rumore ?? 0.3) * 0.55;
      if (rng() < prob) {
        const t = tonoDi(p);
        aggiungi(a.quando + (2 + rng() * 180) * 60 * 1000, p.id, scegli(t.reazioni), null, true);
      }
    }
  }

  // --- 3. Buongiorno / buonanotte dei buongiornisti nei giorni di scuola.
  const PROB_BUONGIORNO = { "nonna-delegata": 0.45, "buongiornista-offtopic": 0.25, "mamma-social": 0.12 };
  for (const giorno of giorniScuola(calendario)) {
    for (const p of nelGruppo) {
      const prob = PROB_BUONGIORNO[p.archetipo];
      if (!prob || giorno.getTime() < attivaDa(p)) continue;
      if (rng() < prob) {
        const t = tonoDi(p);
        const sera = p.archetipo === "mamma-social";
        const ora = sera ? 21.5 + rng() * 1.5 : 6.5 + rng() * 1.2;
        aggiungi(giorno.getTime() + ora * MS_ORA, p.id, scegli(t.buongiorno || t.reazioni), null, true);
      }
    }
  }

  // --- 4. Valanghe di auguri: compleanni + feste comandate.
  const occasioni = [
    ...calendario.compleanniFesteggiati.map((c) => ({
      quando: c.quando,
      testoExtra: null,
      esclusa: c.genitore, // il festeggiato non si fa gli auguri da solo
    })),
    { quando: "2025-12-24", testoExtra: "Buon Natale a tutte le famiglie! 🎄", esclusa: null },
    { quando: "2025-12-31", testoExtra: "Buon anno!! 🎆", esclusa: null },
    { quando: "2026-01-06", testoExtra: "Buona Befana ai bimbi 🧦", esclusa: null },
    { quando: "2026-04-05", testoExtra: "Buona Pasqua a tutti 🐣", esclusa: null },
  ];
  for (const occ of occasioni) {
    const base = new Date(`${occ.quando}T08:00:00`).getTime();
    const quanti = 8 + Math.floor(rng() * 7);
    const candidati = nelGruppo.filter((p) => p.id !== occ.esclusa && base >= attivaDa(p));
    const mischiati = [...candidati].sort(() => rng() - 0.5).slice(0, quanti);
    for (const p of mischiati) {
      const t = tonoDi(p);
      const testo = occ.testoExtra
        ? p.archetipo === "nonna-delegata"
          ? occ.testoExtra.toUpperCase() + " 🙏🌸"
          : occ.testoExtra
        : scegli(t.auguri || TONO.neutro.auguri);
      aggiungi(base + rng() * 13 * MS_ORA, p.id, testo, null, true);
    }
  }

  // --- 5. Catene e off-topic sporadici (mensili).
  const catene = [
    { persona: "rosa.marino", testo: "⚠️ INOLTRATO: ATTENZIONE truffa del finto pacco in consegna, girate a tutti i genitori 🙏" },
    { persona: "paolo.ferrari", testo: "scusate l'off topic ma sabato i nostri hanno vinto 3 a 1 💪⚽ grandi ragazzi" },
    { persona: "elena.gatti", testo: "Ragazze segnalo laboratorio creativo gratuito in biblioteca sabato, se interessa 🎨" },
  ];
  for (const [meseStr] of Object.entries(targetMese)) {
    for (const c of catene) {
      if (rng() < 0.5) {
        const giorno = 5 + Math.floor(rng() * 18);
        const quando = new Date(`${meseStr}-${String(giorno).padStart(2, "0")}T17:00:00`).getTime();
        const p = personaDi.get(c.persona);
        if (p && quando >= attivaDa(p)) aggiungi(quando + rng() * 4 * MS_ORA, c.persona, c.testo, null, true);
      }
    }
  }

  // --- 6. Riempimento fino al volume target del mese (reazioni extra
  // agganciate alle ancore del mese: è così che i gruppi veri arrivano
  // a 400+ messaggi).
  const contaMese = () => {
    const conta = {};
    for (const m of messaggi) {
      const chiave = iso(m.quando).slice(0, 7);
      conta[chiave] = (conta[chiave] || 0) + 1;
    }
    return conta;
  };
  const conta = contaMese();
  for (const [meseStr, target] of Object.entries(targetMese)) {
    let mancanti = target - (conta[meseStr] || 0);
    const ancoreMese = ancore.filter((a) => a.mese === meseStr);
    if (ancoreMese.length === 0) continue;
    let giri = 0;
    while (mancanti > 0 && giri < 5000) {
      giri++;
      const a = scegli(ancoreMese);
      const p = scegli(nelGruppo);
      if (a.quando < attivaDa(p)) continue;
      if (rng() > (p.comportamento?.rumore ?? 0.3)) continue;
      const t = tonoDi(p);
      aggiungi(a.quando + (5 + rng() * 600) * 60 * 1000, p.id, scegli(t.reazioni), null, true);
      mancanti--;
    }
  }

  // --- Ordina e scrivi.
  messaggi.sort((x, y) => x.quando - y.quando);
  const cartellaUscite = path.join(__dirname, "uscite");
  fs.mkdirSync(cartellaUscite, { recursive: true });

  const righe = messaggi.map((m) =>
    JSON.stringify({
      quando: iso(m.quando),
      persona: m.persona,
      nome: personaDi.get(m.persona)?.nome || m.persona,
      testo: m.testo,
      rifPost: m.rifPost,
      rumore: m.rumore,
    })
  );
  fs.writeFileSync(path.join(cartellaUscite, "chat-whatsapp.jsonl"), righe.join("\n") + "\n", "utf-8");

  // Statistiche per il report.
  const stat = {};
  for (const m of messaggi) {
    const chiave = iso(m.quando).slice(0, 7);
    stat[chiave] = stat[chiave] || { totale: 0, significativi: 0, rumore: 0 };
    stat[chiave].totale++;
    stat[chiave][m.rumore ? "rumore" : "significativi"]++;
  }
  const totale = messaggi.length;
  const rumoreTot = messaggi.filter((m) => m.rumore).length;
  const statistiche = {
    totale,
    significativi: totale - rumoreTot,
    rumore: rumoreTot,
    percentualeRumore: Math.round((rumoreTot / totale) * 100),
    perMese: stat,
  };
  fs.writeFileSync(
    path.join(cartellaUscite, "statistiche-chat.json"),
    JSON.stringify(statistiche, null, 2),
    "utf-8"
  );

  // --- Visualizzatore HTML stile WhatsApp (autonomo, dati incorporati).
  const datiJson = JSON.stringify(
    messaggi.map((m) => ({
      q: iso(m.quando),
      p: personaDi.get(m.persona)?.nome || m.persona,
      t: m.testo,
      r: m.rumore ? 1 : 0,
    }))
  );
  const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>5B Genitori — chat simulata</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, sans-serif; background:#e5ddd5; }
  header { position:sticky; top:0; background:#075e54; color:#fff; padding:10px 16px; z-index:2; }
  header h1 { margin:0; font-size:18px; }
  header .sub { font-size:12px; opacity:.85; }
  .controlli { position:sticky; top:56px; background:#f0f0f0; padding:8px 16px; display:flex; gap:12px; align-items:center; z-index:2; border-bottom:1px solid #ccc; flex-wrap:wrap; }
  .controlli input[type=search] { flex:1; min-width:160px; padding:8px 12px; border-radius:18px; border:1px solid #bbb; font-size:15px; }
  .controlli label { font-size:13px; display:flex; gap:4px; align-items:center; }
  #conta { font-size:12px; color:#555; }
  main { max-width:760px; margin:0 auto; padding:12px; }
  .giorno { text-align:center; margin:14px 0 6px; }
  .giorno span { background:#d9ecf5; border-radius:8px; padding:3px 10px; font-size:12px; color:#333; }
  .msg { background:#fff; border-radius:8px; padding:6px 10px; margin:3px 0; max-width:85%; box-shadow:0 1px 1px rgba(0,0,0,.08); white-space:pre-wrap; word-wrap:break-word; font-size:14.5px; }
  .msg.rep { background:#dcf8c6; margin-left:auto; }
  .msg .chi { font-size:12.5px; font-weight:600; margin-bottom:2px; }
  .msg .ora { font-size:10.5px; color:#888; text-align:right; margin-top:2px; }
  .msg a { color:#0b6aa2; word-break:break-all; }
  .nascosto { display:none; }
</style></head><body>
<header><h1>5B Genitori 💬</h1><div class="sub">${nelGruppo.length} partecipanti — anno simulato 2025/26</div></header>
<div class="controlli">
  <input id="cerca" type="search" placeholder="Cerca nella chat (come su WhatsApp)…">
  <label><input id="soloSegnale" type="checkbox"> nascondi il rumore</label>
  <span id="conta"></span>
</div>
<main id="lista"></main>
<script>
const DATI = ${datiJson};
const COLORI = {};
let tinta = 0;
function colore(nome){ if(!COLORI[nome]){ COLORI[nome] = "hsl(" + (tinta = (tinta + 47) % 360) + ",55%,38%)"; } return COLORI[nome]; }
function linkify(t){ return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/(https?:\\/\\/[^\\s]+)/g, '<a href="$1" target="_blank">$1</a>'); }
const lista = document.getElementById("lista");
let ultimoGiorno = "";
const frammento = document.createDocumentFragment();
for (const m of DATI) {
  const giorno = new Date(m.q).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  if (giorno !== ultimoGiorno) {
    ultimoGiorno = giorno;
    const sep = document.createElement("div"); sep.className = "giorno separatore";
    sep.innerHTML = "<span>" + giorno + "</span>"; frammento.appendChild(sep);
  }
  const div = document.createElement("div");
  div.className = "msg" + (m.p === "Denise Fabbri" ? " rep" : "");
  div.dataset.rumore = m.r; div.dataset.testo = (m.p + " " + m.t).toLowerCase();
  const ora = new Date(m.q).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  div.innerHTML = '<div class="chi" style="color:' + colore(m.p) + '">' + m.p + "</div>" + linkify(m.t) + '<div class="ora">' + ora + "</div>";
  frammento.appendChild(div);
}
lista.appendChild(frammento);
const conta = document.getElementById("conta");
function filtra(){
  const q = document.getElementById("cerca").value.toLowerCase().trim();
  const solo = document.getElementById("soloSegnale").checked;
  let visibili = 0;
  for (const el of lista.querySelectorAll(".msg")) {
    const ok = (!q || el.dataset.testo.includes(q)) && (!solo || el.dataset.rumore === "0");
    el.classList.toggle("nascosto", !ok);
    if (ok) visibili++;
  }
  conta.textContent = visibili + " / " + DATI.length + " messaggi";
  const filtroAttivo = q || solo;
  for (const s of lista.querySelectorAll(".separatore")) s.classList.toggle("nascosto", !!filtroAttivo && !q && solo === false);
}
document.getElementById("cerca").addEventListener("input", filtra);
document.getElementById("soloSegnale").addEventListener("change", filtra);
filtra();
</script></body></html>`;
  fs.writeFileSync(path.join(cartellaUscite, "chat-whatsapp.html"), html, "utf-8");

  console.log(`Chat generata: ${totale} messaggi (${statistiche.significativi} segnale, ${rumoreTot} rumore = ${statistiche.percentualeRumore}%).`);
  for (const [mese, s] of Object.entries(stat).sort()) {
    console.log(`  ${mese}: ${s.totale} totali (target ${targetMese[mese] || "-"}), rumore ${Math.round((s.rumore / s.totale) * 100)}%`);
  }
  console.log(`\nFile: scripts/simulazione/uscite/chat-whatsapp.{jsonl,html}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
