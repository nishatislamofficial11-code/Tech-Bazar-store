-- Remembers which customer SMS were sent for an order (2026-11-24). Safe to run more than once.
alter table public.orders add column if not exists sms_sent text[] not null default '{}';

select 'OK' as result;
