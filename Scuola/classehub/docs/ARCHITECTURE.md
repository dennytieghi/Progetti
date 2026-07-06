# ARCHITECTURE â€” ClasseHub

## Struttura cartelle

```
app/
â”œâ”€â”€ (public)/
â”‚   â”œâ”€â”€ page.tsx                    # landing
â”‚   â”œâ”€â”€ crea-classe/                # onboarding rappresentante
â”‚   â”œâ”€â”€ entra/                      # onboarding genitore
â”‚   â”œâ”€â”€ in-attesa/                  # schermata membership pending
â”‚   â””â”€â”€ auth/                       # magic link callback
â”œâ”€â”€ (app)/
â”‚   â”œâ”€â”€ layout.tsx                  # richiede auth + membership active
â”‚   â”œâ”€â”€ c/[classCode]/              # namespace classe
â”‚   â”‚   â”œâ”€â”€ page.tsx                # home bacheca
â”‚   â”‚   â”œâ”€â”€ p/[postSlug]/           # dettaglio post pubblico condivisibile
â”‚   â”‚   â”œâ”€â”€ nuovo/                  # rappresentante: crea post
â”‚   â”‚   â”œâ”€â”€ richieste/              # rappresentante: coda richieste genitori
â”‚   â”‚   â”œâ”€â”€ impostazioni/           # rappresentante: gestione classe
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ approvazioni/       # rappresentante: coda iscrizioni pending
â”‚   â”‚   â”‚   â””â”€â”€ membri/             # rappresentante: lista membri, mute, remove
â”‚   â”‚   â””â”€â”€ invia-richiesta/        # genitore: crea richiesta
â”‚   â””â”€â”€ account/                    # gestione account (logout)
â”œâ”€â”€ api/
â”‚   â””â”€â”€ (nessuna route API custom in V1, tutto Server Actions)
components/
â”œâ”€â”€ ui/                              # shadcn generati
â”œâ”€â”€ posts/                           # PostCard, PostForm, PostList
â”œâ”€â”€ polls/                           # PollVote, PollResults
â””â”€â”€ shared/                          # Header, Banner, EmptyState
lib/
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ server.ts                    # client server-side
â”‚   â”œâ”€â”€ client.ts                    # client browser-side
â”‚   â””â”€â”€ middleware.ts
â”œâ”€â”€ db/
â”‚   â”œâ”€â”€ queries.ts                   # SELECT helpers
â”‚   â”œâ”€â”€ mutations.ts                 # INSERT/UPDATE helpers
â”‚   â””â”€â”€ types.gen.ts                 # generati
â”œâ”€â”€ auth/
â”‚   â””â”€â”€ require-membership.ts        # guard Server Actions (status='active')
â”œâ”€â”€ whatsapp/
â”‚   â””â”€â”€ format-message.ts            # generatore testo copia-incolla
â”œâ”€â”€ codes/
â”‚   â””â”€â”€ generate.ts                  # codici classe human-friendly
â”œâ”€â”€ i18n/
â”‚   â””â”€â”€ it.ts
â””â”€â”€ validation/
    â””â”€â”€ schemas.ts                   # Zod schemas
docs/
â”œâ”€â”€ (i .md giÃ  presenti)
â””â”€â”€ TEST_PLAN.md                     # generato in fase test
```

## Schema database (Postgres/Supabase)

```sql
-- Estensioni
create extension if not exists pgcrypto;

-- CLASSES
create table classes (
  id uuid primary key default gen_random_uuid(),
  class_code text unique not null,           -- 6 char, human-friendly
  name text not null,                        -- "3A Scuola Rossi"
  emergency_code_hash text not null,         -- hash del codice di emergenza
  created_at timestamptz default now(),
  archived_at timestamptz
);

-- USERS: gestiti da Supabase Auth. Estensione profilo:
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

-- MEMBERSHIPS (parent â†” class, con ruolo e stato di approvazione)
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  role text not null check (role in ('representative','parent')),
  status text not null default 'pending' check (status in ('pending','active','rejected','removed')),
  note_for_rep text,                          -- valorizzato in pending, azzerato in approvazione
  rejection_reason text,                      -- valorizzato solo se rejected
  muted boolean default false,                -- silenziato dal rappresentante (solo lettura)
  joined_at timestamptz default now(),
  decided_at timestamptz,                     -- quando approvato/rifiutato
  decided_by uuid references auth.users(id),  -- chi ha deciso (rappresentante)
  ended_at timestamptz,                       -- se removed
  unique (user_id, class_id)
);

create index on memberships (class_id, status);
create index on memberships (user_id);

-- POSTS (avvisi/scadenze/sondaggi/materiale)
create table posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  type text not null check (type in ('notice','deadline','poll','material')),
  slug text not null,                        -- 4 char per URL corti
  title text not null,
  body text,
  due_date timestamptz,                      -- per deadline
  pinned boolean default false,
  archived boolean default false,
  photo_path text,                           -- path in Storage
  created_at timestamptz default now(),
  unique (class_id, slug)
);

create index on posts (class_id, archived, pinned desc, created_at desc);

-- POLLS (dettaglio sondaggi, 1:1 con posts type='poll')
create table polls (
  post_id uuid primary key references posts(id) on delete cascade,
  closes_at timestamptz not null,
  closed_manually boolean default false
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  label text not null,
  ord int not null
);

create table poll_votes (
  post_id uuid not null references posts(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  voter_hash text not null,                  -- hash(user_id + poll_salt): anonimo ma no doppio voto
  voted_at timestamptz default now(),
  primary key (post_id, option_id, voter_hash)
);

create index on poll_votes (post_id);

-- REQUESTS (richieste dei genitori al rappresentante)
create table requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  status text not null default 'open' check (status in ('open','handled','archived')),
  converted_to_post_id uuid references posts(id),
  created_at timestamptz default now()
);

create index on requests (class_id, status, created_at desc);

-- RATE LIMITING (richieste dei genitori)
-- Implementazione: check via query counting su requests.created_at negli ultimi 24h.
-- Max 5 open+handled per author_id in una classe.
```

## RLS Policies (principi)

Ogni tabella ha RLS `enable` e policy di questo tipo:

- **classes**: SELECT solo se `EXISTS (memberships where user_id = auth.uid() and class_id = classes.id and status = 'active')`.
- **memberships**: SELECT del proprio record sempre (per vedere il proprio status pending). SELECT di altri membri solo se richiedente ha `status='active'` nella stessa classe.
- **posts, requests, polls, poll_options**: SELECT/INSERT solo membership con `status='active'` nella classe. Le scritture avviso/sondaggio solo se `role='representative'`.
- **UPDATE memberships (approvazione/rifiuto/mute/remove)**: solo se attore Ã¨ `representative` `active` della stessa `class_id`.
- **INSERT requests**: solo `parent` `active` non `muted`, e rate check via funzione SQL.
- **INSERT poll_votes**: solo membro `active`, non `muted`, e non oltre `closes_at`.
- **poll_votes SELECT aggregato**: solo dopo che il voter_hash del richiedente Ã¨ presente nella tabella per quel `post_id`.

## Flusso magic link + membership

1. Genitore inserisce codice classe + nome + email + (opzionale) nota.
2. Server Action valida (Zod + query DB): codice classe esiste.
3. `signInWithOtp` su Supabase Auth.
4. Callback magic link: upsert `profiles`, crea `memberships` con `status='pending'` e `note_for_rep`.
5. Redirect a `/in-attesa`.
6. Rappresentante approva â†’ Server Action con guard `role='representative' + status='active'`:
   - `status='active'`, `decided_at=now()`, `decided_by=uid`, `note_for_rep=null`.
   - Invia email transazionale al genitore (Supabase Auth email o Resend).
7. Genitore clicca il link nell'email â†’ redirect a `/c/{class_code}`.

## Codici human-friendly
- Alfabeto: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no O/0, I/1/l).
- Class code: 6 char.
- Emergency code: 12 char, mostrato una volta sola in PDF, salvato hashed (bcrypt) in `classes.emergency_code_hash`.
- Post slug: 4 char, unico per classe.

## Storage

- Bucket `class-photos`, path `{class_id}/{post_id}/{filename}`.
- Policy: SELECT solo per membri `active` della classe. INSERT solo rappresentante.
- Conversione HEIC â†’ JPEG server-side in Server Action (`sharp`).
- Limite dimensione: 5 MB per foto, resize automatico a max 1600px lato lungo.

## Generatore messaggio WhatsApp

`lib/whatsapp/format-message.ts` esporta `formatPostForWhatsapp(post)` che ritorna stringa pronta con:
- Emoji basata su tipo (ðŸ“¢/â°/ðŸ—³ï¸/ðŸ“Ž).
- Titolo maiuscolo.
- Data scadenza formattata in italiano ("entro venerdÃ¬ 12 dicembre") se `deadline`.
- URL corto `https://{domain}/c/{class_code}/p/{slug}` (usa slug 4 char).

Il pulsante "Copia" nel client usa `navigator.clipboard.writeText`.