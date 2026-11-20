-- One customer login works on every Cloud Commerce shop (2026-11-22).
-- Each shop still sees only its own customers and orders. Safe to run more than once. Deletes no data.

-- Which shops a customer has signed in to
create table if not exists public.store_customers (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
alter table public.store_customers enable row level security;
drop policy if exists store_customers_read on public.store_customers;
create policy store_customers_read on public.store_customers for select to authenticated
  using (user_id = auth.uid()
         or ((public.is_store_admin() or public.is_super_admin()) and store_id = public.current_store_id()));
revoke insert, update, delete on public.store_customers from anon, authenticated;
grant select on public.store_customers to authenticated;

-- Existing customers belong to the shop they signed up on
insert into public.store_customers (store_id, user_id)
select p.store_id, p.id from public.profiles p
where p.role = 'user' and p.store_id is not null and exists (select 1 from auth.users u where u.id = p.id)
on conflict do nothing;

-- Called after a customer signs in or signs up on a shop: lets them in and records them as that shop's customer.
-- Owners, staff and super admins are refused here (they use the Cloud Commerce login).
create or replace function public.join_store_as_customer(p_slug text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_store uuid; v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if v_uid is null then return false; end if;
  if v_slug = '' then v_store := public.current_store_id();
  else select id into v_store from public.stores where slug = v_slug; end if;
  if v_store is null or not exists (select 1 from public.stores where id = v_store and is_active) then return false; end if;
  if exists (select 1 from public.super_admins where user_id = v_uid) then return false; end if;
  if exists (select 1 from public.user_roles where user_id = v_uid and role in ('admin','manager','demo')) then return false; end if;
  if exists (select 1 from public.profiles where id = v_uid and role = 'blocked') then return false; end if;
  insert into public.store_customers (store_id, user_id) values (v_store, v_uid) on conflict do nothing;
  return true;
end $$;
revoke all on function public.join_store_as_customer(text) from public, anon;
grant execute on function public.join_store_as_customer(text) to authenticated;

select 'OK' as result;
