# SETUP — ClasseHub

L'app gira su **Supabase** (progetto `classehub`, regione eu-central-1,
GDPR). Lo store JSON del PoC non esiste più (resta nella cronologia git
fino al commit `855fb8c`).

## Sviluppo locale

Requisiti: Node 20+ e un file `.env.local` (non è su git) con:

```
NEXT_PUBLIC_SUPABASE_URL=https://<progetto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…   # chiave pubblica
SUPABASE_SECRET_KEY=sb_secret_…                  # SOLO server, mai nel browser
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Le chiavi: dashboard Supabase → Settings → API Keys (le nuove chiavi
`sb_publishable_…` / `sb_secret_…`; equivalgono a anon / service_role).

```powershell
corepack pnpm install
corepack pnpm dev
```

- **Modalità dimostrazione** (solo in sviluppo): le email non partono;
  il riquadro giallo mostra il link, generato con la chiave segreta
  (`auth.admin.generateLink`). Così non si consuma il limite di ~2
  email/ora del piano gratuito. In produzione partono email vere.
- **Ri-accesso di un utente esistente** (finché manca il login, V1.5):
  `node scripts/dev-login.js email@esempio.it` stampa un link d'accesso.
- **Dati**: vivono su Supabase. Per ripartire da zero: SQL Editor →
  `truncate classes cascade; delete from auth.users;` (attenzione:
  cancella tutto).

## Preparare un nuovo progetto Supabase

1. Crea il progetto su https://supabase.com — regione **eu-central-1**.
2. SQL Editor → esegui in ordine tutti i file di
   `supabase/migrations/` (da `0001_init.sql` in avanti).
3. Bucket Storage e relative policy (non fanno parte delle migrazioni)
   — sempre nel SQL Editor:
   ```sql
   insert into storage.buckets (id, name, public)
     values ('class-photos', 'class-photos', false);
   create policy photos_select on storage.objects for select
     using (bucket_id = 'class-photos' and is_active_member((split_part(name, '/', 1))::uuid));
   create policy photos_insert on storage.objects for insert
     with check (bucket_id = 'class-photos' and is_representative((split_part(name, '/', 1))::uuid));
   ```
4. Copia le chiavi in `.env.local` (vedi sopra).

## Pagamenti con carta (Stripe, facoltativo)

Senza chiave Stripe la cassa funziona solo in contanti: la parte carta
non compare. Per attivarla in **test mode** (soldi finti):

1. Crea un account su https://stripe.com (va fatto a mano, serve email).
2. Dashboard Stripe → attiva la **modalità test** (interruttore in alto)
   → Developers → API keys → copia la **Secret key** (`sk_test_…`).
3. Aggiungi in `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_…
   ```
4. Riavvia `corepack pnpm dev`. Nella scheda Cassa il rappresentante
   trova "Collega Stripe"; in test mode l'onboarding si può saltare con
   i dati finti proposti da Stripe.
5. Per pagare come genitore usa la carta di test `4242 4242 4242 4242`,
   scadenza futura qualsiasi, CVC qualsiasi.

**Produzione**: NON attivare la chiave live prima delle condizioni in
ADR-014 (deploy Vercel + webhook, entità legale, decisione commissioni).

## Architettura degli accessi (per chi eredita il codice)

- `lib/db/supabase.ts` — due client: `supabaseServer()` (sessione utente,
  **tutto passa dalla RLS**) e `supabaseAdmin()` (chiave segreta, scavalca
  la RLS; usato SOLO dove documentato nel codice: creazione classe,
  lookup pre-login, email dei membri, segreti one-time, link demo).
- Il **salt** dei sondaggi non lascia mai il database: la colonna è
  vietata ai client (grant per colonna, 0002); voto e "ho già votato"
  passano dalle funzioni `cast_poll_vote` / `has_voted`.
- Le email transazionali (approvato/rifiutato/rimosso) in sviluppo
  finiscono nel log del server (`lib/email/send.ts`).

## Andare in produzione (Vercel)

1. Email transazionali: account su https://resend.com (3.000/mese
   gratis) → `RESEND_API_KEY` → riscrivi il corpo di `lib/email/send.ts`.
2. Importa il repo su https://vercel.com (framework: Next.js, pnpm).
3. Variabili d'ambiente: le tre chiavi Supabase + `RESEND_API_KEY` +
   `NEXT_PUBLIC_BASE_URL=https://tuodominio.it`.
4. Supabase → Authentication → URL Configuration: imposta Site URL e
   Redirect URLs sul dominio di produzione.
5. Deploy. Collega il dominio e configura SPF/DKIM su Resend.

## Variabili d'ambiente

| Nome | Dove serve | Note |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | dev + prod | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dev + prod | pubblica (RLS attiva) |
| `SUPABASE_SECRET_KEY` | dev + prod | SOLO server, mai nel client |
| `NEXT_PUBLIC_BASE_URL` | dev + prod | link WhatsApp ed email |
| `RESEND_API_KEY` | prod | email transazionali |
| `STRIPE_SECRET_KEY` | dev + prod | facoltativa; senza, la cassa è solo contanti |
