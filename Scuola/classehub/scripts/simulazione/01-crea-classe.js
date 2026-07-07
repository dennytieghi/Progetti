// Passo 1 della simulazione: crea la classe finta TEST5B con il
// rappresentante e i genitori descritti in dati/personas.json.
// Gli utenti sono account Supabase veri (creati via API admin, email
// già confermata) così la webapp li tratta esattamente come persone reali.
//
// Uso:   node scripts/simulazione/01-crea-classe.js
// Undo:  node scripts/simulazione/99-pulizia.js
const {
  clientAdmin,
  leggiJson,
  scriviJson,
  hashCodiceEmergenza,
  generaCodice,
} = require("./lib/comune");
const config = require("./config");

function emailDi(persona) {
  return `${persona.id}@${config.EMAIL_DOMAIN}`;
}

/** joined_at qualche ora prima della decisione, come nella realtà. */
function dataDecisione(iscrittoIl, oreDopo) {
  const d = new Date(`${iscrittoIl}T20:00:00+02:00`);
  d.setHours(d.getHours() + oreDopo);
  return d.toISOString();
}

async function creaUtente(admin, persona) {
  const email = emailDi(persona);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { simulazione: true, archetipo: persona.archetipo },
  });
  if (error) throw new Error(`Creazione utente ${email} fallita: ${error.message}`);
  const userId = data.user.id;

  const { error: errProfilo } = await admin
    .from("profiles")
    .upsert({ user_id: userId, display_name: persona.nome }, { onConflict: "user_id" });
  if (errProfilo) throw new Error(`Profilo ${email} fallito: ${errProfilo.message}`);

  return userId;
}

async function main() {
  const admin = clientAdmin();
  const personas = leggiJson("personas.json");

  // La classe finta non deve già esistere: niente doppioni silenziosi.
  const { data: esistente } = await admin
    .from("classes")
    .select("id")
    .eq("class_code", config.CLASS_CODE)
    .maybeSingle();
  if (esistente) {
    console.error(
      `La classe ${config.CLASS_CODE} esiste già.\n` +
        "Esegui prima: node scripts/simulazione/99-pulizia.js"
    );
    process.exit(1);
  }

  // 1. Classe (creata retrodatata all'inizio dell'anno scolastico).
  const { data: klass, error: errClasse } = await admin
    .from("classes")
    .insert({
      class_code: config.CLASS_CODE,
      name: config.CLASS_NAME,
      emergency_code_hash: hashCodiceEmergenza(generaCodice(12)),
      created_at: config.ANNO.creazioneClasse,
    })
    .select()
    .single();
  if (errClasse) throw new Error(`Creazione classe fallita: ${errClasse.message}`);
  console.log(`Classe creata: ${klass.name} (${klass.class_code})`);

  // 2. Rappresentante: membership attiva dal giorno di creazione classe.
  const rep = personas.rappresentante;
  const repUserId = await creaUtente(admin, rep);
  const { error: errRep } = await admin.from("memberships").insert({
    user_id: repUserId,
    class_id: klass.id,
    role: "representative",
    status: "active",
    joined_at: config.ANNO.creazioneClasse,
    decided_at: config.ANNO.creazioneClasse,
    decided_by: repUserId,
  });
  if (errRep) throw new Error(`Membership rappresentante fallita: ${errRep.message}`);
  console.log(`Rappresentante: ${rep.nome}`);

  // 3. Genitori: ognuno con la propria data di iscrizione e stato finale.
  const registroUtenti = { [rep.id]: repUserId };
  for (const g of personas.genitori) {
    const userId = await creaUtente(admin, g);
    registroUtenti[g.id] = userId;

    const stato = g.statoFinale || "active";
    const riga = {
      user_id: userId,
      class_id: klass.id,
      role: "parent",
      status: stato,
      muted: g.muted === true,
      joined_at: `${g.iscrittoIl}T20:00:00+02:00`,
    };
    // pending = ancora in attesa (nessuna decisione registrata).
    if (stato !== "pending") {
      riga.decided_at = dataDecisione(g.iscrittoIl, g.oreAttesaApprovazione ?? 18);
      riga.decided_by = repUserId;
    }
    if (stato === "pending") riga.note_for_rep = g.notaPerRep || null;
    if (stato === "rejected") riga.rejection_reason = g.motivoRifiuto || null;
    if (stato === "removed") riga.ended_at = dataDecisione(g.rimossoIl || g.iscrittoIl, 0);

    const { error: errG } = await admin.from("memberships").insert(riga);
    if (errG) throw new Error(`Membership ${g.nome} fallita: ${errG.message}`);
    console.log(`  Genitore: ${g.nome} [${g.archetipo}] → ${stato}`);
  }

  // 4. Registro id: serve agli script successivi (caricamento post/voti).
  const file = scriviJson("registro-classe.json", {
    creatoIl: new Date().toISOString(),
    classId: klass.id,
    classCode: klass.class_code,
    utenti: registroUtenti,
  });
  console.log(`\nFatto. Registro scritto in ${file}`);
  console.log(`Genitori creati: ${personas.genitori.length} + 1 rappresentante.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
