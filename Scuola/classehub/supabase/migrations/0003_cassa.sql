-- ============================================================
-- ClasseHub — Cassa di classe (migrazione 0003)
-- Modello: la cassa è comune, ma ogni movimento è intestato.
--   - versamento ('deposit'): UNA quota, del genitore che ha versato.
--   - spesa ('expense'): una quota per OGNI genitore che partecipa
--     (importo a testa). Chi non partecipa non viene toccato.
-- Saldo personale = somma versamenti - somma quote spesa.
-- Saldo cassa     = somma dei totali dei movimenti (deposit - expense).
-- ============================================================

-- Conto Stripe collegato dal rappresentante (Connect Standard).
-- Null finché il rappresentante non completa il collegamento.
alter table classes add column stripe_account_id text;

-- ------------------------------------------------------------ MOVIMENTI
create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  kind text not null check (kind in ('deposit','expense')),
  title text not null,                       -- causale: "Gita a Verona"
  total_cents int not null check (total_cents > 0),
  source text not null default 'manual' check (source in ('manual','stripe')),
  -- Idempotenza pagamenti carta: una Checkout Session = un movimento.
  stripe_session_id text unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index on cash_movements (class_id, created_at desc);

-- ------------------------------------------------------------ QUOTE
-- La parte di un movimento che riguarda un singolo genitore.
-- L'applicazione garantisce: somma quote = total_cents del movimento.
create table cash_shares (
  movement_id uuid not null references cash_movements(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  amount_cents int not null check (amount_cents > 0),
  primary key (movement_id, user_id)
);

create index on cash_shares (user_id);

-- ============================================================
-- RLS
-- ============================================================

alter table cash_movements enable row level security;
alter table cash_shares enable row level security;

-- MOVIMENTI: tutti i membri attivi vedono i movimenti della classe
-- (la cassa è comune: totali e causali sono trasparenti per tutti).
create policy cash_movements_select on cash_movements
  for select using (is_active_member(class_id));

-- Scrittura manuale: solo il rappresentante, a suo nome.
-- I movimenti 'stripe' nascono SOLO lato server (service role) dopo
-- la verifica del pagamento: nessuna policy client li consente.
create policy cash_movements_insert_rep on cash_movements
  for insert with check (
    is_representative(class_id)
    and created_by = auth.uid()
    and source = 'manual'
  );

-- Correzione errori: si cancella e si reinserisce (nessun update).
-- I movimenti Stripe non si cancellano: rappresentano soldi veri
-- incassati sulla carta; le correzioni passano dai rimborsi (V2).
create policy cash_movements_delete_rep on cash_movements
  for delete using (is_representative(class_id) and source = 'manual');

-- QUOTE: ognuno vede le proprie; il rappresentante le vede tutte
-- (gli serve per gestire la cassa e rispondere ai genitori).
create policy cash_shares_select_own on cash_shares
  for select using (user_id = auth.uid());
create policy cash_shares_select_rep on cash_shares
  for select using (
    is_representative((select class_id from cash_movements where id = movement_id))
  );

create policy cash_shares_insert_rep on cash_shares
  for insert with check (
    is_representative((select class_id from cash_movements where id = movement_id))
  );
-- Niente delete diretta: le quote spariscono col movimento (cascade).
