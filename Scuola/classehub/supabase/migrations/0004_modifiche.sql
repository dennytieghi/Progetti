-- ============================================================
-- ClasseHub — Modifica post e modifica spese (migrazione 0004)
-- ============================================================

-- Quando un post viene modificato dopo la pubblicazione, i genitori
-- devono vederlo ("Modificato il ..."): un avviso che cambia in
-- silenzio crea sfiducia. Null = mai modificato.
alter table posts add column edited_at timestamptz;

-- Modifica spese: il rappresentante può correggere causale, importo
-- e partecipanti. Solo i movimenti manuali: quelli Stripe sono soldi
-- veri incassati sulla carta e si correggono con i rimborsi (V2).
create policy cash_movements_update_rep on cash_movements
  for update using (is_representative(class_id) and source = 'manual')
  with check (source = 'manual');

-- La modifica dei partecipanti sostituisce le quote: servono la
-- cancellazione (qui) e l'inserimento (policy già in 0003).
create policy cash_shares_delete_rep on cash_shares
  for delete using (
    is_representative((select class_id from cash_movements where id = movement_id))
  );
