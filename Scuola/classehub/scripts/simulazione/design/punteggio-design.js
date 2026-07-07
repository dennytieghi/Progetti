// Calcola l'Indice di Semplicità (0-100) dalle misure raccolte.
// Formula documentata in METODO-DESIGN.md: A conformità (40) +
// B percorsi (40) + C inclusione (20). Rifare il calcolo dà lo stesso
// risultato: niente giudizi nel punteggio, solo i file di misura.
//
// Input:  design/misure/*.json  (una schermata per file, da raccogli-misure.js)
//         design/viaggi.json    (tap, budget, esitazioni, blocchi, feedback)
//         design/inclusione.json (checklist con esito true/false)
// Uso:    node scripts/simulazione/design/punteggio-design.js
const fs = require("fs");
const path = require("path");

const QUI = __dirname;
const arrotonda = (n) => Math.round(n * 10) / 10;

function main() {
  // ---------------------------------------------------------- A. conformità
  const cartella = path.join(QUI, "misure");
  const schermate = fs
    .readdirSync(cartella)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ nome: f.replace(".json", ""), ...JSON.parse(fs.readFileSync(path.join(cartella, f), "utf-8")) }));
  if (schermate.length === 0) throw new Error("Nessuna misura in design/misure/");

  const media = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const a1 = media(
    schermate.map((s) => {
      const t = s.testo;
      if (!t.totale) return 1;
      const quotaCorpo = (t.corpoOk + t.microOk) / t.totale; // ≥15px con micro
      const quotaPiena = t.corpoOk / t.totale;
      const lh = t.lhTot ? t.lhOk / t.lhTot : 1;
      // metà peso al corpo pieno ≥17, metà a "almeno micro" + interlinea
      return 0.5 * quotaPiena + 0.35 * quotaCorpo + 0.15 * lh;
    })
  ) * 10;

  const a2 = media(
    schermate.map((s) => {
      const t = s.target;
      return t.totale ? (t.ok48 + 0.5 * t.quasi44) / t.totale : 1;
    })
  ) * 10;

  const a3 = media(
    schermate.map((s) => {
      const t = s.testo;
      const conColore = t.AAA + t.AA + t.sottoAA;
      return conColore ? (t.AAA + 0.5 * t.AA) / conColore : 1;
    })
  ) * 10;

  const gergoTrovato = [...new Set(schermate.flatMap((s) => s.gergo))];
  const a4 = Math.max(
    0,
    media(
      schermate.map((s) => {
        const okScelte = s.azioni.bottoni <= 4 ? 1 : s.azioni.bottoni <= 6 ? 0.5 : 0;
        const okCta = s.azioni.ctaEvidenti <= 1 ? 1 : 0.5;
        return 0.5 * okScelte + 0.5 * okCta;
      })
    ) * 10 - gergoTrovato.length
  );

  const A = a1 + a2 + a3 + a4;

  // ------------------------------------------------------------ B. percorsi
  const viaggi = JSON.parse(fs.readFileSync(path.join(QUI, "viaggi.json"), "utf-8"));
  const puntiViaggi = viaggi.map((v) => {
    let p = 10;
    p -= Math.max(0, (v.tap ?? 0) - (v.budgetTap ?? Infinity));
    p -= 2 * (v.esitazioni?.length || 0);
    p -= 4 * (v.blocchi?.length || 0);
    p -= v.feedbackMancante ? 1 : 0;
    return { id: v.id, punti: Math.max(0, p) };
  });
  const B = puntiViaggi.reduce((a, b) => a + b.punti, 0);

  // ---------------------------------------------------------- C. inclusione
  const inclusione = JSON.parse(fs.readFileSync(path.join(QUI, "inclusione.json"), "utf-8"));
  const C = inclusione.reduce((somma, voce) => somma + (voce.esito ? voce.punti : 0), 0);

  const totale = arrotonda(A + B + C);
  const report = {
    generatoIl: new Date().toISOString(),
    indiceSemplicita: totale,
    A: { totale: arrotonda(A), tipografia: arrotonda(a1), bersagli: arrotonda(a2), contrasto: arrotonda(a3), sobrieta: arrotonda(a4), gergoTrovato },
    B: { totale: B, viaggi: puntiViaggi },
    C: { totale: C, checklist: inclusione },
    schermate: schermate.map((s) => ({
      nome: s.nome,
      testoSotto15: s.testo.sotto15,
      contrastoSottoAA: s.testo.sottoAA,
      casiContrasto: s.testo.casiSotto,
      targetSotto44: s.target.sotto44,
      casiPiccoli: s.target.casiPiccoli,
      bottoni: s.azioni.bottoni,
      ctaEvidenti: s.azioni.ctaEvidenti,
      scrollOrizzontale: s.scrollOrizzontale,
      inputSenzaLabel: s.inputs.totale - s.inputs.conLabel,
    })),
  };
  fs.writeFileSync(path.join(QUI, "report-design.json"), JSON.stringify(report, null, 2), "utf-8");

  console.log(`INDICE DI SEMPLICITÀ: ${totale}/100`);
  console.log(`  A conformità misurata: ${arrotonda(A)}/40  (tipografia ${arrotonda(a1)} · bersagli ${arrotonda(a2)} · contrasto ${arrotonda(a3)} · sobrietà ${arrotonda(a4)})`);
  if (gergoTrovato.length) console.log(`    gergo trovato: ${gergoTrovato.join(", ")}`);
  console.log(`  B percorsi vissuti: ${B}/40  (${puntiViaggi.map((v) => `${v.id}:${v.punti}`).join(" · ")})`);
  console.log(`  C inclusione: ${C}/20`);
  console.log("\nDettaglio: scripts/simulazione/design/report-design.json");
}

main();
