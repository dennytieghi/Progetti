// Strumento SOLO per lo sviluppo locale (modalità dimostrazione).
//
// Problema che risolve: il PoC non ha ancora un login per utenti già
// registrati (in roadmap, V1.5). Se fai "Esci" resti chiuso fuori.
// Questo script genera un nuovo magic link nello store locale
// (.data/db.json): lo apri nel browser e sei di nuovo dentro.
// Usa lo stesso percorso di codice del callback reale.
//
// Uso:   node scripts/dev-login.js email@esempio.it
// Esempio: node scripts/dev-login.js rep@test.it
//
// NON funziona (e non serve) con Supabase in produzione.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "..", ".data", "db.json");
const email = process.argv[2];
if (!email) {
  console.error("Uso: node scripts/dev-login.js <email>");
  process.exit(1);
}
if (!fs.existsSync(DB_PATH)) {
  console.error("Store locale non trovato (" + DB_PATH + "). Avvia prima l'app.");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
const user = db.auth_users.find((u) => u.email === email.toLowerCase());
if (!user) {
  console.error("Nessun utente con email " + email);
  process.exit(1);
}
const profile = db.profiles.find((p) => p.user_id === user.id);

const link = {
  token: crypto.randomBytes(24).toString("hex"),
  email: user.email,
  display_name: (profile && profile.display_name) || "Utente",
  // kind non gestito dal callback: crea solo la sessione, senza toccare
  // classi o membership, e porta su /account.
  payload: { kind: "dev_login" },
  created_at: new Date().toISOString(),
  used_at: null,
};
db.magic_links.push(link);
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
console.log("Apri questo link (vale una volta, per 24 ore):");
console.log("http://localhost:3000/auth/callback?token=" + link.token);
