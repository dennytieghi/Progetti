-- ============================================================
-- ClasseHub — Pagamenti semplici (migrazione 0006)
-- Via Stripe; il rappresentante pubblica le SUE coordinate e i
-- genitori pagano fuori dall'app. Il genitore dichiara il
-- versamento; la cassa si aggiorna solo alla conferma.
-- ============================================================

-- Coordinate di pagamento della classe (tutte facoltative).
alter table classes
  add column payment_iban text,
  add column payment_iban_holder text,
  add column payment_paypal text,
  add column payment_satispay text;
alter table classes drop column stripe_account_id;

-- Metodo di pagamento sul movimento; via i resti di Stripe.
-- Le policy che citavano source vanno ricreate senza.
drop policy cash_movements_insert_rep on cash_movements;
drop policy cash_movements_delete_rep on cash_movements;
alter table cash_movements drop column source;
alter table cash_movements drop column stripe_session_id;
alter table cash_movements add column method text not null default 'contanti'
  check (method in ('contanti','bonifico','satispay','paypal','altro'));

create policy cash_movements_insert_rep on cash_movements
  for insert with check (is_representative(class_id) and created_by = auth.uid());
create policy cash_movements_delete_rep on cash_movements
  for delete using (is_representative(class_id));

-- ------------------------------------------------- DICHIARAZIONI
-- Il genitore segnala "ho versato"; niente entra nei saldi finché
-- il rappresentante non conferma (la conferma crea il movimento).
create table cash_declarations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  amount_cents int not null check (amount_cents > 0),
  method text not null check (method in ('contanti','bonifico','satispay','paypal','altro')),
  note text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  movement_id uuid references cash_movements(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index on cash_declarations (class_id, status, created_at desc);
create index on cash_declarations (user_id);

alter table cash_declarations enable row level security;

-- Il genitore vede solo le proprie; il rappresentante tutte.
create policy cash_declarations_select_own on cash_declarations
  for select using (user_id = auth.uid());
create policy cash_declarations_select_rep on cash_declarations
  for select using (is_representative(class_id));

-- Solo un membro ATTIVO dichiara, solo a proprio nome, solo pending.
create policy cash_declarations_insert_own on cash_declarations
  for insert with check (
    is_active_member(class_id)
    and user_id = auth.uid()
    and status = 'pending'
    and movement_id is null
    and decided_at is null
  );

-- Decide solo il rappresentante. Niente delete: le rifiutate restano.
create policy cash_declarations_update_rep on cash_declarations
  for update using (is_representative(class_id));
