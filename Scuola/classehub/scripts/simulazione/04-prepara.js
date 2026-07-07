// Passo 4a: prepara i "sondaggi di reperibilità" per l'agente valutatore.
// Pesca dal registro dei fatti (ground truth scritta dagli agenti dei mesi)
// ~30 bisogni informativi con una data casuale D in cui qualcuno li cerca.
//
// Output:
//   uscite/valutazione/sondaggi.json  → quello che vede il CERCATORE (cieco)
//   uscite/valutazione/verita.json    → quello che vede solo il GIUDICE
//
// Uso: node scripts/simulazione/04-prepara.js
const fs = require("fs");
const path = require("path");
const { leggiJson, creaRng, CARTELLA_DATI } = require("./lib/comune");
const config = require("./config");

const rng = creaRng(config.SEME + 2);
const FINE_ANNO = new Date("2026-06-20T12:00:00+02:00").getTime();
const MS_GIORNO = 24 * 3600 * 1000;

function main() {
  const registroPost = leggiJson("registro-post.json");

  // Tutti i fatti di tutti i mesi.
  const cartellaMesi = path.join(CARTELLA_DATI, "mesi");
  const fatti = [];
  for (const f of fs.readdirSync(cartellaMesi).filter((x) => x.endsWith(".json")).sort()) {
    const mese = JSON.parse(fs.readFileSync(path.join(cartellaMesi, f), "utf-8"));
    for (const fatto of mese.fatti || []) fatti.push(fatto);
  }
  const perId = new Map(fatti.map((f) => [f.id, f]));

  // Catene di sostituzione: la verità a una data D è l'ultima versione
  // pubblicata prima di D (es. orario recita cambiato in corsa).
  const sostituiti = new Set(fatti.filter((f) => f.sostituisce).map((f) => f.sostituisce));
  const radici = fatti.filter((f) => !f.sostituisce);
  const catenaDi = (radice) => {
    const catena = [radice];
    let corrente = radice;
    for (;;) {
      const succ = fatti.find((f) => f.sostituisce === corrente.id);
      if (!succ) break;
      catena.push(succ);
      corrente = succ;
    }
    return catena;
  };

  const sondaggi = [];
  const verita = {};
  let n = 0;

  for (const radice of radici) {
    const catena = catenaDi(radice);
    const t0 = new Date(radice.pubblicatoIl).getTime();
    if (Number.isNaN(t0)) continue;

    // Due date di ricerca per fatto: una vicina (3-20 giorni dopo) e, per
    // metà dei fatti, una LONTANA (1-5 mesi dopo: il test vero della
    // reperibilità è cercare a distanza di tempo).
    const date = [t0 + (3 + rng() * 17) * MS_GIORNO];
    if (rng() < 0.5) date.push(t0 + (30 + rng() * 150) * MS_GIORNO);

    for (const dMs of date) {
      if (dMs > FINE_ANNO) continue;
      n++;
      const id = `s${String(n).padStart(2, "0")}`;
      const dataD = new Date(dMs).toISOString();
      // Verità alla data D: ultima versione della catena già pubblicata.
      const versione = [...catena]
        .filter((f) => new Date(f.pubblicatoIl).getTime() <= dMs)
        .pop();
      const post = registroPost[versione.rifPost] || null;
      // La catena completa serve al punteggio: aprire il post VECCHIO di
      // un'informazione poi aggiornata vale meno che aprire quello giusto.
      const catenaVisibile = catena.filter(
        (f) => new Date(f.pubblicatoIl).getTime() <= dMs
      );
      sondaggi.push({ id, domanda: radice.domanda, dataD });
      verita[id] = {
        fattoId: versione.id,
        rispostaAttesa: versione.risposta,
        rifPost: versione.rifPost,
        slug: post?.slug || null,
        catenaRif: catenaVisibile.map((f) => f.rifPost),
        catenaSlug: catenaVisibile
          .map((f) => registroPost[f.rifPost]?.slug)
          .filter(Boolean),
      };
    }
  }

  // Se sono troppi, campiona ~30 mantenendo la distribuzione temporale.
  sondaggi.sort((a, b) => new Date(a.dataD) - new Date(b.dataD));
  let scelti = sondaggi;
  if (sondaggi.length > 32) {
    scelti = [];
    const passo = sondaggi.length / 30;
    for (let i = 0; i < sondaggi.length; i += passo) scelti.push(sondaggi[Math.floor(i)]);
  }
  const veritaScelte = {};
  for (const s of scelti) veritaScelte[s.id] = verita[s.id];

  const cartella = path.join(__dirname, "uscite", "valutazione");
  fs.mkdirSync(cartella, { recursive: true });
  fs.writeFileSync(path.join(cartella, "sondaggi.json"), JSON.stringify(scelti, null, 2), "utf-8");
  fs.writeFileSync(path.join(cartella, "verita.json"), JSON.stringify(veritaScelte, null, 2), "utf-8");

  console.log(`Fatti trovati: ${fatti.length} (${sostituiti.size} sostituiti da aggiornamenti).`);
  console.log(`Sondaggi preparati: ${scelti.length} → uscite/valutazione/sondaggi.json`);
  console.log("La verità (solo per il giudice) è in uscite/valutazione/verita.json");
}

main();
