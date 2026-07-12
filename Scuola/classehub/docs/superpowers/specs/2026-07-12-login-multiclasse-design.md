# Login di rientro + multiclasse (V1.5) — design approvato (12/7/2026)

Decisioni prese con Denny in brainstorming. Chiude il buco "utente già
registrato senza porta di rientro" (telefono→PC, logout, nuovo
dispositivo) e dà una casa alle persone con più classi. Colma anche il
gap di enumerazione emerso nell'analisi sicurezza del 12/7.

## Decisioni chiave

1. **Due chiavi, una porta**: link magico (base universale) + "Accedi
   con Google" (acceleratore), entrambe sulla nuova pagina pubblica
   `/accedi`. Niente password (mai). Le classi sono legate all'account,
   non al metodo: nessuna raccomandazione differenziata per chi ha più
   classi.
2. **Email in modalità demo** come il resto dell'onboarding (il link
   compare a schermo in sviluppo). Resend arriva col cantiere deploy.
3. **Setup Google Cloud fatto insieme in questo cantiere** (progetto
   OAuth + consenso + chiavi in Supabase): il bottone funziona e si
   testa da subito. Finché le chiavi non ci sono, il bottone non
   compare (guardia su variabile d'ambiente).
4. **Nessun collegamento account con email diverse** in V1.5: Google
   con la stessa email dell'iscrizione si aggancia da solo (Supabase);
   con un'email diversa sei un utente nuovo senza classi e finisci sul
   benvenuto con la spiegazione.

## Le pagine

### `/accedi` (pubblica)

- Linkata dalla landing: terzo invito "Sei già registrato? Accedi".
- Form email → invia un NUOVO link magico. `shouldCreateUser: false`:
  la pagina non crea mai account.
- Risposta SEMPRE neutra: "Se questa email è iscritta, riceve il
  link" — identica per email registrate e non (anti-enumerazione).
  In demo, il link compare solo se l'invio è davvero partito.
- Bottone "Accedi con Google" (solo se il provider è configurato).
- Rate limit invii: quello di serie di Supabase (per email e per IP).

### Callback esteso (`/auth/callback`)

- Oggi gestisce `token_hash` (link magico). Si aggiunge il ramo OAuth
  (scambio `code` → sessione con @supabase/ssr).
- Il callback distingue i flussi col parametro `intent` già esistente
  (il dev-login usa `intent=login` da sempre): con `intent=login` e per
  il ritorno OAuth scatta lo **smistamento unico**; i flussi di
  REGISTRAZIONE (crea classe, entra) mantengono i loro intent e i loro
  redirect attuali (pending → in-attesa, ecc.).
- Smistamento (conta le membership ATTIVE):
  - 0 → `/benvenuto`
  - 1 → `/c/{classCode}` di quella membership
  - 2+ → `/classi`

### `/benvenuto` (interna, serve solo la sessione)

- "Non risulti in nessuna classe": CTA "Entra con un codice classe" e
  "Crea una classe" + spiegazione del caso Google-email-diversa
  ("se ti eri iscritto con un'altra email, esci e accedi con quella").

### `/classi` (interna, serve solo la sessione)

- Una card per membership, stile redesign: nome classe (Space Grotesk
  22px) + pillola ruolo (Rappresentante indaco / Genitore neutra) +
  stato "in attesa di approvazione" per le pending (non cliccabile
  verso la bacheca). Click su una attiva → `/c/{classCode}`.
- In fondo: "Entra in un'altra classe" (→ /entra) e "Crea una classe"
  (→ /crea-classe) — flussi esistenti, che vanno VERIFICATI per
  utenti già loggati (oggi mai testati in quel caso).
- Sidebar e barra mobile: il nome della classe diventa link a
  `/classi` (per tutti, anche con una sola classe).

## Sicurezza

- `/accedi` non crea account e non rivela chi è iscritto.
- Il testo dell'email/demo include "questo link è personale, non
  inoltrarlo".
- Nessuna modifica a RLS, membership o guardie per-classe.
- Google eredita l'eventuale 2FA dell'account Google dell'utente.

## Setup Google (guidato, fuori dal codice)

1. Google Cloud Console → nuovo progetto → schermata consenso OAuth
   (external, solo email/profile) → credenziali OAuth 2.0 web.
2. Redirect URI: quello del progetto Supabase
   (`https://<ref>.supabase.co/auth/v1/callback`).
3. Supabase → Auth → Providers → Google: client ID + secret.
4. Supabase → Auth → URL configuration: aggiungere
   `http://localhost:3000/auth/callback` ai redirect consentiti.
5. In `.env.local`: `NEXT_PUBLIC_GOOGLE_LOGIN=1` (la guardia che fa
   comparire il bottone).

## Cosa NON fa (rimandato)

- Password (mai). Collegamento manuale di account con email diverse.
- "Esci da tutti i dispositivi". Inviti via email a una classe.
- Invio email reale (cantiere deploy). Notifiche.

## Test

- Unit: logica di smistamento post-login (0/1/N membership, pending
  escluse) come funzione pura.
- Manuale (TEST_PLAN §18): rientro via link da browser pulito;
  `/accedi` con email non registrata → messaggio neutro identico;
  Google stessa email → stesse classi; Google email diversa →
  benvenuto; utente in 2 classi → `/classi` e cambio classe dalla
  sidebar; utente loggato che entra in una seconda classe col codice
  e che crea una seconda classe; pending in `/classi` non cliccabile;
  ruoli corretti nelle due classi (rep in A scrive, genitore in B no).
