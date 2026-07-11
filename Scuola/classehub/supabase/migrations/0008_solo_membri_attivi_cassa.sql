-- ============================================================
-- ClasseHub — Solo membri ATTIVI leggono la cassa (migrazione 0008)
-- La 0007 aveva perso il requisito di membership attiva sulla
-- SELECT dei movimenti: un genitore rimosso poteva ancora leggere
-- via API i movimenti a cui aveva partecipato (CLAUDE.md §7:
-- l'RLS stessa deve imporre lo stato attivo). Stessa stretta
-- sulle quote, che avevano il difetto fin dalla 0003.
-- ============================================================

drop policy cash_movements_select_own on cash_movements;
create policy cash_movements_select_own on cash_movements
  for select using (has_cash_share(id) and is_active_member(class_id));

drop policy cash_shares_select_own on cash_shares;
create policy cash_shares_select_own on cash_shares
  for select using (
    user_id = auth.uid()
    and is_active_member(
      (select class_id from cash_movements where id = movement_id)
    )
  );

-- Riduce la superficie RPC senza rompere le policy sopra: durante la
-- valutazione di una RLS policy, il controllo EXECUTE sulla funzione
-- richiamata (has_cash_share) si applica al ruolo CHIAMANTE (quello di
-- PostgREST, "authenticated"), non al proprietario della funzione —
-- SECURITY DEFINER eleva solo i privilegi ALL'INTERNO della funzione,
-- non l'autorizzazione a invocarla. Revocare EXECUTE ad "authenticated"
-- romperebbe quindi ogni SELECT del genitore con "permission denied for
-- function has_cash_share". Si segue perciò lo stesso schema già usato
-- in 0007 per class_cash_total: si toglie l'accesso di default (PUBLIC,
-- che include anon) e si ridà esplicitamente solo ad "authenticated".
revoke execute on function has_cash_share(uuid) from public, anon;
grant execute on function has_cash_share(uuid) to authenticated;
