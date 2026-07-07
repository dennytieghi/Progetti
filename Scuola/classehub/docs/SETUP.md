# SETUP — ClasseHub

## Avviare il PoC in locale (adesso, senza servizi esterni)

Requisiti: Node 20+ (funziona anche con Node 24). Niente Docker, niente account.

```powershell
corepack pnpm install
corepack pnpm dev
```

Apri http://localhost:3000. Tutto funziona subito:

- **I dati** vivono in `.data/db.json` (creato al primo uso). Per ripartire
  da zero: cancella la cartella `.data/`.
- **Le email non partono davvero**: finiscono nel log del server e in
  `.data/db.json` (sezione `outbox`). Dopo ogni form che "manda un'email"
  compare un riquadro giallo **Modalità dimostrazione** con il pulsante che
  apre il link al posto tuo.
- **Le foto** caricate finiscono in `.data/uploads/`.

### Demo in 5 minuti (per mostrarla a un cliente)

1. Home → **Crea la classe** → compila → riquadro giallo → "Apri il link".
2. Ottieni il foglio stampabile con **codice classe** e **codice di emergenza**
   (mostrato solo questa volta).
3. Apri una **finestra in incognito** → **Entra in una classe** → usa il codice.
4. Torna nella prima finestra → Impostazioni → **Richieste di iscrizione** →
   Approva.
5. In incognito → "Controlla se sei stato approvato" → sei in bacheca.
6. Da rappresentante: **Pubblica** → Sondaggio → dopo la pubblicazione hai il
   testo pronto con **Copia per WhatsApp**.
7. In incognito: apri il sondaggio → vota → risultati.

## Passare in produzione (Supabase + Vercel)

Il PoC è costruito perché il passaggio tocchi SOLO tre punti:
`lib/db/queries.ts` + `lib/db/mutations.ts` (dati), `lib/auth/*` (sessione),
`lib/email/send.ts` (email). Le pagine e le Server Actions non cambiano.

### 1. Supabase

1. Crea un progetto su https://supabase.com — regione **eu-central-1**
   (Francoforte, GDPR).
2. Applica la migrazione: SQL Editor → incolla
   `supabase/migrations/0001_init.sql` → Run.
   Oppure con la CLI: `npx supabase db push`.
3. Crea il bucket Storage `class-photos` (privato) e applica le policy
   commentate in fondo alla migrazione.
4. Auth → abilita **Email (magic link)**, disabilita signup con password.
5. Copia da Project Settings → API: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mai la service_role nel client!).

### 2. Codice

1. `corepack pnpm add @supabase/supabase-js @supabase/ssr`
2. Genera i tipi: `npx supabase gen types typescript --project-id <id> > lib/db/types.gen.ts`
3. Riscrivi l'interno delle funzioni di `lib/db/queries.ts` e
   `lib/db/mutations.ts` con le chiamate Supabase (stesse firme).
   Il voto usa la RPC: `supabase.rpc('cast_poll_vote', {...})`.
4. Sostituisci `lib/auth/session.ts` con la sessione di `@supabase/ssr`
   e il callback `app/(public)/auth/callback/route.ts` con
   `supabase.auth.verifyOtp` / `exchangeCodeForSession`.
5. Email transazionali (approvato/rifiutato/rimosso): account su
   https://resend.com (3.000 email/mese gratis) → `RESEND_API_KEY` →
   riscrivi il corpo di `lib/email/send.ts` con la chiamata a Resend.

### 3. Vercel

1. Importa il repo su https://vercel.com (framework: Next.js, package
   manager: pnpm).
2. Variabili d'ambiente: le due chiavi Supabase + `RESEND_API_KEY` +
   `NEXT_PUBLIC_BASE_URL=https://tuodominio.it`.
3. Deploy. Collega il dominio e configura SPF/DKIM su Resend.

## Variabili d'ambiente

| Nome | Dove serve | Note |
| --- | --- | --- |
| `SESSION_SECRET` | PoC | opzionale in dev (auto-generato in `.data/`) |
| `NEXT_PUBLIC_BASE_URL` | PoC + prod | usato nei link WhatsApp e nelle email |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | |
| `RESEND_API_KEY` | prod | email transazionali |
