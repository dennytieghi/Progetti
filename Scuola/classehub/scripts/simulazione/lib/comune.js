// Utility comuni agli script di simulazione (stress test di un anno
// scolastico). SOLO sviluppo locale: usano la chiave segreta di
// Supabase letta da .env.local, come scripts/dev-login.js.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const RADICE_PROGETTO = path.join(__dirname, "..", "..", "..");
const CARTELLA_DATI = path.join(__dirname, "..", "dati");

function leggiEnv() {
  const file = path.join(RADICE_PROGETTO, ".env.local");
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

/** Client Supabase con chiave segreta: bypassa l'RLS, mai nel browser. */
function clientAdmin() {
  const env = leggiEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// --- Codici: stesse regole di lib/codes/generate.ts (copiate qui perché
// --- questi script girano in Node puro, senza il compilatore TypeScript).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generaCodice(lunghezza, rng = Math.random) {
  let out = "";
  for (let i = 0; i < lunghezza; i++) {
    out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Slug post: 4 caratteri minuscoli, unico per classe. */
function generaSlug(rng = Math.random) {
  return generaCodice(4, rng).toLowerCase();
}

/** Stesso formato "salt:hash" di hashEmergencyCode in lib/codes/generate.ts. */
function hashCodiceEmergenza(codice) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(codice.toUpperCase(), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Hash anonimo del votante, identico a cast_poll_vote nel database:
 * sha256(user_id + ":" + salt) in esadecimale.
 */
function hashVotante(userId, salt) {
  return crypto.createHash("sha256").update(`${userId}:${salt}`).digest("hex");
}

/**
 * Generatore pseudo-casuale CON SEME (mulberry32): a parità di seme la
 * simulazione produce sempre gli stessi risultati, così i test sono
 * ripetibili e i bug riproducibili.
 */
function creaRng(seme) {
  let a = seme >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percorsoDati(nomeFile) {
  return path.join(CARTELLA_DATI, nomeFile);
}

function leggiJson(nomeFile) {
  const file = percorsoDati(nomeFile);
  if (!fs.existsSync(file)) {
    console.error(`File dati mancante: ${file}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function scriviJson(nomeFile, dati) {
  const file = percorsoDati(nomeFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(dati, null, 2) + "\n", "utf-8");
  return file;
}

module.exports = {
  RADICE_PROGETTO,
  CARTELLA_DATI,
  leggiEnv,
  clientAdmin,
  CODE_ALPHABET,
  generaCodice,
  generaSlug,
  hashCodiceEmergenza,
  hashVotante,
  creaRng,
  percorsoDati,
  leggiJson,
  scriviJson,
};
