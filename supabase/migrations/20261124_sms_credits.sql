-- SMS credits (2026-11-24): shops buy SMS from Cloud Commerce; messages go out through the
-- platform's BulkSMSBD account and each SMS part uses one credit. Safe to run more than once. Deletes no data.

create table if not exists public.sms_wallets (
  store_id uuid primary key references public.stores(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.sms_transactions (
  id bigserial primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  change int not null,
  amount_tk numeric,
  reason text not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists sms_transactions_store_idx on public.sms_transactions (store_id, created_at desc);

alter table public.sms_wallets enable row level security;
alter table public.sms_transactions enable row level security;
drop policy if exists shop_read on public.sms_wallets;
create policy shop_read on public.sms_wallets for select to authenticated
  using ((store_id = public.current_store_id() and public.is_store_admin()) or public.is_super_admin());
drop policy if exists shop_read on public.sms_transactions;
create policy shop_read on public.sms_transactions for select to authenticated
  using ((store_id = public.current_store_id() and public.is_store_admin()) or public.is_super_admin());
revoke all on public.sms_wallets, public.sms_transactions from anon, authenticated;
grant select on public.sms_wallets, public.sms_transactions to authenticated;

insert into public.platform_settings (key, value) values ('sms_price', '0.50') on conflict (key) do nothing;

-- Server only: take SMS credits before sending (false when the balance is too low)
create or replace function public.sms_use(p_store uuid, p_count int, p_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_left int;
begin
  if p_count is null or p_count < 1 then return false; end if;
  update public.sms_wallets set balance = balance - p_count, updated_at = now()
   where store_id = p_store and balance >= p_count
  returning balance into v_left;
  if v_left is null then return false; end if;
  insert into public.sms_transactions (store_id, change, reason) values (p_store, -p_count, left(coalesce(p_reason, 'sms'), 60));
  return true;
end $$;

-- Server only: give credits back when sending failed
create or replace function public.sms_refund(p_store uuid, p_count int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_count is null or p_count < 1 then return; end if;
  insert into public.sms_wallets (store_id, balance) values (p_store, p_count)
  on conflict (store_id) do update set balance = public.sms_wallets.balance + p_count, updated_at = now();
  insert into public.sms_transactions (store_id, change, reason) values (p_store, p_count, left(coalesce(p_reason, 'refund'), 60));
end $$;
revoke all on function public.sms_use(uuid, int, text) from public, anon, authenticated;
revoke all on function public.sms_refund(uuid, int, text) from public, anon, authenticated;
grant execute on function public.sms_use(uuid, int, text) to service_role;
grant execute on function public.sms_refund(uuid, int, text) to service_role;

-- Super admin: add (or remove, with a negative count) SMS for a shop, e.g. after a payment
create or replace function public.super_add_sms(p_store uuid, p_count int, p_amount numeric, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare v_balance int;
begin
  if not public.is_super_admin() then raise exception 'শুধু সুপার এডমিন'; end if;
  if p_count is null or p_count = 0 or abs(p_count) > 1000000 then raise exception 'SMS সংখ্যা দিন'; end if;
  if not exists (select 1 from public.stores where id = p_store) then raise exception 'দোকান পাওয়া যায়নি'; end if;
  insert into public.sms_wallets (store_id, balance) values (p_store, greatest(p_count, 0))
  on conflict (store_id) do update set balance = greatest(public.sms_wallets.balance + p_count, 0), updated_at = now()
  returning balance into v_balance;
  insert into public.sms_transactions (store_id, change, amount_tk, reason, note, created_by)
  values (p_store, p_count, p_amount, case when p_count > 0 then 'purchase' else 'adjustment' end, left(p_note, 200), auth.uid());
  return v_balance;
end $$;
revoke all on function public.super_add_sms(uuid, int, numeric, text) from public, anon;
grant execute on function public.super_add_sms(uuid, int, numeric, text) to authenticated;

select 'OK' as result;
