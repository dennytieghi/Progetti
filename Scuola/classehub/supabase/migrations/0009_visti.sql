-- 0009 — "L'ho visto" sui post.
-- Il genitore spunta avvisi, scadenze e materiale come visti (mai i
-- sondaggi: lì conta il voto, che resta anonimo per ADR-003). Il
-- rappresentante legge i visti della sua classe per sapere chi manca.
-- Da incollare nell'SQL Editor di Supabase (tutto in una volta).

create table post_reads (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index on post_reads (post_id);

alter table post_reads enable row level security;

-- Il visto si mette solo per sé, da membro attivo della classe del
-- post, e mai su un sondaggio. La subquery su posts passa dalla RLS
-- di posts (membri attivi), che qui va benissimo.
create policy post_reads_insert_own on post_reads
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from posts p
      where p.id = post_id
        and p.type <> 'poll'
        and is_active_member(p.class_id)
    )
  );

-- Il visto si toglie solo per sé.
create policy post_reads_delete_own on post_reads
  for delete using (user_id = auth.uid());

-- Lettura: le proprie righe sempre; tutte quelle della classe al
-- rappresentante (per il conteggio "chi l'ha visto").
create policy post_reads_select_own on post_reads
  for select using (user_id = auth.uid());

create policy post_reads_select_rep on post_reads
  for select using (exists (
    select 1 from posts p
    where p.id = post_id
      and is_representative(p.class_id)
  ));
