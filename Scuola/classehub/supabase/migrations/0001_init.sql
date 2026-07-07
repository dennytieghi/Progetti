-- ============================================================
-- ClasseHub — Schema iniziale + RLS (produzione Supabase)
-- Regione consigliata: eu-central-1 (GDPR).
-- Ogni tabella ha RLS ATTIVA: nessuna tabella pubblica (CLAUDE.md §7).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------ CLASSES
create table classes (
  id uuid primary key default gen_random_uuid(),
  class_code text unique not null,           -- 6 char, human-friendly
  name text not null,                        -- "3A Scuola Rossi"
  emergency_code_hash text not null,         -- bcrypt via crypt()
  created_at timestamptz default now(),
  archived_at timestamptz
);

-- ------------------------------------------------------------ PROFILES
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------ MEMBERSHIPS
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  role text not null check (role in ('representative','parent')),
  status text not null default 'pending'
    check (status in ('pending','active','rejected','removed')),
  note_for_rep text,
  rejection_reason text,
  muted boolean default false,
  joined_at timestamptz default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  ended_at timestamptz,
  unique (user_id, class_id)
);

create index on memberships (class_id, status);
create index on memberships (user_id);

-- ------------------------------------------------------------ POSTS
create table posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  type text not null check (type in ('notice','deadline','poll','material')),
  slug text not null,                        -- 4 char per URL corti
  title text not null,
  body text,
  due_date timestamptz,
  pinned boolean default false,
  archived boolean default false,
  photo_path text,
  created_at timestamptz default now(),
  unique (class_id, slug)
);

create index on posts (class_id, archived, pinned desc, created_at desc);

-- ------------------------------------------------------------ POLLS
create table polls (
  post_id uuid primary key references posts(id) on delete cascade,
  closes_at timestamptz not null,
  closed_manually boolean default false,
  -- Salt per l'hash anonimo dei votanti (ADR-003). Mai esposto ai client:
  -- il voto passa dalla funzione cast_poll_vote qui sotto.
  salt text not null default encode(gen_random_bytes(16), 'hex')
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
  voter_hash text not null,                  -- hash(user_id || salt)
  voted_at timestamptz default now(),
  primary key (post_id, option_id, voter_hash)
);

create index on poll_votes (post_id);

-- ------------------------------------------------------------ REQUESTS
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

-- ============================================================
-- FUNZIONI DI SUPPORTO (security definer: evitano ricorsione RLS)
-- ============================================================

create or replace function is_active_member(target_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid()
      and class_id = target_class
      and status = 'active'
  );
$$;

create or replace function is_representative(target_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid()
      and class_id = target_class
      and status = 'active'
      and role = 'representative'
  );
$$;

create or replace function is_muted(target_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select muted from memberships
    where user_id = auth.uid() and class_id = target_class and status = 'active'
  ), true);
$$;

-- ============================================================
-- RLS — attiva su OGNI tabella
-- ============================================================

alter table classes enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table posts enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table requests enable row level security;

-- CLASSES: visibili solo ai membri attivi. Scritture solo dal server
-- (service role) durante l'onboarding: nessuna policy insert/update client.
create policy classes_select on classes
  for select using (is_active_member(id));

-- PROFILES: il proprio sempre; gli altri solo se si condivide una classe attiva.
create policy profiles_select_own on profiles
  for select using (user_id = auth.uid());
create policy profiles_select_classmates on profiles
  for select using (exists (
    select 1 from memberships m1
    join memberships m2 on m1.class_id = m2.class_id
    where m1.user_id = auth.uid() and m1.status = 'active'
      and m2.user_id = profiles.user_id and m2.status in ('active','pending')
  ));
create policy profiles_upsert_own on profiles
  for insert with check (user_id = auth.uid());
create policy profiles_update_own on profiles
  for update using (user_id = auth.uid());

-- MEMBERSHIPS: la propria sempre (per vedere lo stato pending);
-- quelle degli altri solo se membro attivo della stessa classe.
create policy memberships_select_own on memberships
  for select using (user_id = auth.uid());
create policy memberships_select_class on memberships
  for select using (is_active_member(class_id));
-- Richiesta di iscrizione: solo per sé, sempre 'pending', ruolo parent.
create policy memberships_insert_pending on memberships
  for insert with check (
    user_id = auth.uid() and status = 'pending' and role = 'parent'
  );
-- Approva/rifiuta/mute/remove: solo il rappresentante attivo della classe.
create policy memberships_update_rep on memberships
  for update using (is_representative(class_id));

-- POSTS: lettura per membri attivi; scrittura solo rappresentante.
create policy posts_select on posts
  for select using (is_active_member(class_id));
create policy posts_insert_rep on posts
  for insert with check (is_representative(class_id) and author_id = auth.uid());
create policy posts_update_rep on posts
  for update using (is_representative(class_id));

-- POLLS / OPTIONS: lettura membri attivi; scrittura rappresentante.
-- NB: la colonna polls.salt non va mai selezionata dal client: usare
-- sempre le funzioni. Con l'SDK, esporre una vista senza salt se serve.
create policy polls_select on polls
  for select using (is_active_member((select class_id from posts where id = post_id)));
create policy polls_insert_rep on polls
  for insert with check (is_representative((select class_id from posts where id = post_id)));
create policy polls_update_rep on polls
  for update using (is_representative((select class_id from posts where id = post_id)));

create policy poll_options_select on poll_options
  for select using (is_active_member((select class_id from posts where id = post_id)));
create policy poll_options_insert_rep on poll_options
  for insert with check (is_representative((select class_id from posts where id = post_id)));

-- POLL_VOTES: lettura aggregata solo dopo aver votato (o da rappresentante);
-- INSERT mai diretto: si vota SOLO via cast_poll_vote (anonimato garantito).
create policy poll_votes_select_voted on poll_votes
  for select using (
    exists (
      select 1 from polls p
      where p.post_id = poll_votes.post_id
        and (
          -- ha già votato (il suo hash è presente)
          exists (
            select 1 from poll_votes v2
            where v2.post_id = p.post_id
              and v2.voter_hash = encode(digest(auth.uid()::text || ':' || p.salt, 'sha256'), 'hex')
          )
          -- oppure il sondaggio è chiuso
          or p.closed_manually
          or p.closes_at <= now()
          -- oppure è il rappresentante
          or is_representative((select class_id from posts where id = p.post_id))
        )
    )
  );

-- REQUESTS: l'autore vede le proprie; il rappresentante tutte quelle della classe.
create policy requests_select_own on requests
  for select using (author_id = auth.uid());
create policy requests_select_rep on requests
  for select using (is_representative(class_id));
-- INSERT: membro attivo, non silenziato, max 5 nelle ultime 24h (rate limit).
create policy requests_insert on requests
  for insert with check (
    author_id = auth.uid()
    and is_active_member(class_id)
    and not is_muted(class_id)
    and (
      select count(*) from requests r
      where r.class_id = requests.class_id
        and r.author_id = auth.uid()
        and r.status in ('open','handled')
        and r.created_at > now() - interval '24 hours'
    ) < 5
  );
create policy requests_update_rep on requests
  for update using (is_representative(class_id));

-- ============================================================
-- VOTO ANONIMO: unica via di scrittura su poll_votes (ADR-003)
-- ============================================================

create or replace function cast_poll_vote(target_post uuid, chosen_options uuid[])
returns boolean language plpgsql security definer set search_path = public as $$
declare
  poll_row polls%rowtype;
  my_hash text;
  opt uuid;
begin
  select * into poll_row from polls where post_id = target_post;
  if not found then return false; end if;

  -- Membro attivo, non silenziato, sondaggio aperto.
  if not is_active_member((select class_id from posts where id = target_post)) then
    return false;
  end if;
  if is_muted((select class_id from posts where id = target_post)) then
    return false;
  end if;
  if poll_row.closed_manually or poll_row.closes_at <= now() then
    return false;
  end if;

  my_hash := encode(digest(auth.uid()::text || ':' || poll_row.salt, 'sha256'), 'hex');

  -- Un solo voto a testa.
  if exists (select 1 from poll_votes where post_id = target_post and voter_hash = my_hash) then
    return false;
  end if;

  foreach opt in array chosen_options loop
    if exists (select 1 from poll_options where id = opt and post_id = target_post) then
      insert into poll_votes (post_id, option_id, voter_hash)
      values (target_post, opt, my_hash);
    end if;
  end loop;

  return true;
end;
$$;

-- ============================================================
-- STORAGE (da eseguire dopo aver creato il bucket "class-photos")
-- ============================================================
-- Policy consigliate sul bucket:
--   SELECT: membri attivi della classe (path: {class_id}/...)
--   INSERT: solo rappresentante.
-- Esempio:
--   create policy photos_select on storage.objects for select
--     using (bucket_id = 'class-photos'
--            and is_active_member((split_part(name, '/', 1))::uuid));
--   create policy photos_insert on storage.objects for insert
--     with check (bucket_id = 'class-photos'
--            and is_representative((split_part(name, '/', 1))::uuid));
