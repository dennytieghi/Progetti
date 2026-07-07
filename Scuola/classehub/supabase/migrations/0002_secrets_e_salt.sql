-- ============================================================
-- ClasseHub — 0002: segreti one-time, protezione salt, has_voted
-- ============================================================

-- Segreti mostrati una volta sola (codice di emergenza dopo la
-- creazione classe). RLS attiva SENZA policy: nessun client può
-- leggerli o scriverli, ci passa solo il server (service role).
create table one_time_secrets (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  emergency_code text not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

alter table one_time_secrets enable row level security;

-- Il salt dei sondaggi non deve MAI arrivare ai client: con salt +
-- elenco membri si potrebbero ricalcolare gli hash e scoprire chi ha
-- votato cosa. L'RLS lavora per riga, non per colonna: qui si tolgono
-- proprio i permessi di lettura sulla colonna.
revoke select on polls from anon, authenticated;
grant select (post_id, closes_at, closed_manually) on polls to anon, authenticated;

-- "Ho già votato?" calcolato nel database, senza esporre il salt.
create or replace function has_voted(target_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from poll_votes v
    join polls p on p.post_id = v.post_id
    where v.post_id = target_post
      and v.voter_hash = encode(
        extensions.digest(auth.uid()::text || ':' || p.salt, 'sha256'), 'hex'
      )
  );
$$;

-- La policy di lettura dei voti (0001) leggeva il salt inline: ora che
-- la colonna è vietata ai client fallirebbe. La si riscrive appoggiata
-- a has_voted (security definer: il salt resta dentro al database).
drop policy poll_votes_select_voted on poll_votes;
create policy poll_votes_select_voted on poll_votes
  for select using (
    has_voted(post_id)
    or exists (
      select 1 from polls p
      where p.post_id = poll_votes.post_id
        and (p.closed_manually or p.closes_at <= now())
    )
    or is_representative((select class_id from posts where id = poll_votes.post_id))
  );
