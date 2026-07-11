-- ============================================================
-- ClasseHub — Eliminazione post dalla bacheca (migrazione 0005)
-- ============================================================

-- Una richiesta trasformata in post non deve bloccare l'eliminazione
-- del post: il collegamento si azzera e la richiesta resta "gestita".
alter table requests
  drop constraint requests_converted_to_post_id_fkey;
alter table requests
  add constraint requests_converted_to_post_id_fkey
    foreign key (converted_to_post_id) references posts(id) on delete set null;

-- Eliminazione definitiva: solo il rappresentante. Sondaggio, opzioni
-- e voti spariscono in cascata (FK on delete cascade, migrazione 0001).
create policy posts_delete_rep on posts
  for delete using (is_representative(class_id));
