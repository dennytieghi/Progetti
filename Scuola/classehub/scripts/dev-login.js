// Strumento SOLO per lo sviluppo locale.
//
// Problema che risolve: l'app non ha ancora un login per utenti già
// registrati (in roadmap, V1.5). Questo script genera un magic link
// tramite l'API admin di Supabase (chiave segreta letta da .env.local,
// mai nel browser) e lo stampa: lo apri e sei dentro.
//
// Uso:   node scripts/dev-login.js email@esempio.it
const fs = require("fs");
const path = require("path");

function leggiEnv() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) {
    console.error(".env.local non trovato. Vedi docs/SETUP.md.");
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/dev-login.js <email>");
    process.exit(1);
  }

  const env = leggiEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email: email.toLowerCase() }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Errore da Supabase: " + (data.msg || data.message || res.status));
    process.exit(1);
  }

  const base = env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  console.log("Apri questo link (vale una volta):");
  console.log(`${base}/auth/callback?intent=login&token_hash=${data.hashed_token}`);
}

main();
