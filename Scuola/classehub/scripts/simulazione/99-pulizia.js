// Cancella TUTTO ciò che la simulazione ha creato su Supabase:
//   1. la classe TEST5B (a cascata: membership, post, sondaggi, voti,
//      richieste, segreti one-time);
//   2. gli utenti auth finti — SOLO quelli con email del dominio di
//      simulazione, mai account veri.
//
// Uso:   node scripts/simulazione/99-pulizia.js
const fs = require("fs");
const { clientAdmin, percorsoDati } = require("./lib/comune");
const config = require("./config");

async function main() {
  const admin = clientAdmin();

  // 1. Classe: la cancellazione fisica qui è voluta (è tutto finto).
  const { data: klass } = await admin
    .from("classes")
    .select("id, name")
    .eq("class_code", config.CLASS_CODE)
    .maybeSingle();
  if (klass) {
    const { error } = await admin.from("classes").delete().eq("id", klass.id);
    if (error) throw new Error(`Cancellazione classe fallita: ${error.message}`);
    console.log(`Classe cancellata: ${klass.name} (${config.CLASS_CODE})`);
  } else {
    console.log(`Nessuna classe ${config.CLASS_CODE} trovata: salto.`);
  }

  // 2. Utenti finti: riconosciuti dal dominio email riservato.
  let cancellati = 0;
  let pagina = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 100 });
    if (error) throw new Error(`Lettura utenti fallita: ${error.message}`);
    const finti = data.users.filter((u) =>
      (u.email || "").endsWith(`@${config.EMAIL_DOMAIN}`)
    );
    for (const u of finti) {
      const { error: errDel } = await admin.auth.admin.deleteUser(u.id);
      if (errDel) throw new Error(`Cancellazione ${u.email} fallita: ${errDel.message}`);
      cancellati++;
    }
    // Si riparte sempre da pagina 1: cancellando, le pagine "scalano".
    if (finti.length === 0) {
      if (data.users.length < 100) break;
      pagina++;
    } else {
      pagina = 1;
    }
  }
  console.log(`Utenti finti cancellati: ${cancellati}`);

  // 3. Registro locale ormai inutile.
  const registro = percorsoDati("registro-classe.json");
  if (fs.existsSync(registro)) {
    fs.unlinkSync(registro);
    console.log("Registro locale rimosso.");
  }

  console.log("\nPulizia completata.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
