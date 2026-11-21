-- Free reminders from Cloud Commerce to shop owners (2026-11-24). Safe to run more than once.
-- Remembers which reminder was sent for which plan period, so each goes out once.
create table if not exists public.merchant_notifications (
  id bigserial primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  kind text not null,
  period_end timestamptz not null,
  channel text not null default 'sms',
  sent_at timestamptz not null default now(),
  unique (store_id, kind, period_end)
);
alter table public.merchant_notifications enable row level security;
drop policy if exists super_read on public.merchant_notifications;
create policy super_read on public.merchant_notifications for select to authenticated using (public.is_super_admin());
revoke all on public.merchant_notifications from anon, authenticated;
grant select on public.merchant_notifications to authenticated;

select 'OK' as result;
