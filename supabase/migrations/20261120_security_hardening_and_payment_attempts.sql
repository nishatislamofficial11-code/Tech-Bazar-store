-- Security hardening + payment attempts (2026-11-20). Safe to run more than once. Deletes no data.
-- Backup of the previous state: backups/2026-11-20-*.sql

-- 1. One row per gateway payment session (short numeric id; SSLCommerz allows max 30 chars; enables retry).
create table if not exists public.payment_attempts (
  id text primary key check (id ~ '^[0-9]{12,30}$'),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  gateway text not null check (gateway in ('sslcommerz','eps','aamarpay')),
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists payment_attempts_order_idx on public.payment_attempts(order_id);
create index if not exists payment_attempts_store_idx on public.payment_attempts(store_id);
alter table public.payment_attempts enable row level security;
drop policy if exists "deny all client access" on public.payment_attempts;
create policy "deny all client access" on public.payment_attempts as permissive for all to anon, authenticated using (false) with check (false);
revoke all on public.payment_attempts from anon, authenticated;

-- 2. Orders: visitors must go through create_checkout_order (price/stock checked on server).
drop policy if exists direct_order_create_no_anon on public.orders;
create policy direct_order_create_no_anon on public.orders as restrictive for insert to anon with check (false);
drop policy if exists direct_item_create_no_anon on public.order_items;
create policy direct_item_create_no_anon on public.order_items as restrictive for insert to anon with check (false);

-- 3. Reviews: visitors only submit pending reviews and only see approved ones; only store staff edit/delete.
drop policy if exists review_submit_pending on public.reviews;
create policy review_submit_pending on public.reviews as restrictive for insert to public
  with check (coalesce(status,'pending') = 'pending' or is_store_admin() or is_super_admin());
drop policy if exists review_public_read on public.reviews;
create policy review_public_read on public.reviews as restrictive for select to public
  using (status = 'approved' or is_store_admin() or is_super_admin());
drop policy if exists review_staff_update on public.reviews;
create policy review_staff_update on public.reviews as restrictive for update to public using (is_store_admin() or is_super_admin());
drop policy if exists review_staff_delete on public.reviews;
create policy review_staff_delete on public.reviews as restrictive for delete to public using (is_store_admin() or is_super_admin());

-- 4. Page views hold visitor IPs: visitors may only add rows; only store staff read/edit/delete.
drop policy if exists pv_staff_read on public.page_views;
create policy pv_staff_read on public.page_views as restrictive for select to public using (is_store_admin() or is_super_admin());
drop policy if exists pv_staff_update on public.page_views;
create policy pv_staff_update on public.page_views as restrictive for update to public using (is_store_admin() or is_super_admin());
drop policy if exists pv_staff_delete on public.page_views;
create policy pv_staff_delete on public.page_views as restrictive for delete to public using (is_store_admin() or is_super_admin());

select 'OK' as result;
