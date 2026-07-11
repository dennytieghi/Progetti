-- ============================================================
-- ClasseHub — Vista genitore ristretta della cassa (migrazione 0007)
-- ADR-017: il genitore vede SOLO i movimenti che lo riguardano
-- (una sua riga in cash_shares); spariscono anche i versamenti
-- degli altri. Il controllo collettivo resta il totale aggregato,
-- esposto da una funzione dedicata senza i singoli movimenti.
-- ============================================================

-- "Questo movimento mi riguarda?" — SECURITY DEFINER per evitare la
-- ricorsione RLS: una policy su cash_movements che leggesse
-- cash_shares direttamente riattiverebbe le policy di cash_shares,
-- che a loro volta leggono cash_movements (stesso motivo di
-- is_active_member in 0001).
create or replace function has_cash_share(target_movement uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cash_shares
    where movement_id = target_movement
      and user_id = auth.uid()
  );
$$;

drop policy cash_movements_select on cash_movements;
create policy cash_movements_select_rep on cash_movements
  for select using (is_representative(class_id));
create policy cash_movements_select_own on cash_movements
  for select using (has_cash_share(id));

-- Totale della cassa per i genitori: SOLO la somma, mai i movimenti.
-- Guardia interna: chi non è membro ATTIVO della classe riceve errore,
-- così la funzione non fa da spioncino sulle classi altrui.
create or replace function class_cash_total(target_class uuid)
returns int language plpgsql stable security definer set search_path = public as $$
begin
  if not is_active_member(target_class) then
    raise exception 'Non sei membro attivo di questa classe';
  end if;
  return coalesce((
    select sum(case when kind = 'deposit' then total_cents else -total_cents end)::int
    from cash_movements
    where class_id = target_class
  ), 0);
end;
$$;

revoke execute on function class_cash_total(uuid) from public, anon;
grant execute on function class_cash_total(uuid) to authenticated;
