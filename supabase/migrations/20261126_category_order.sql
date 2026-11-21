-- Category order (2026-11-26): shops choose which category comes first on the home page.
-- Keeps today's order (newest first) as the starting order. Safe to run more than once. Deletes no data.
alter table public.categories add column if not exists sort_order int not null default 0;

update public.categories c set sort_order = r.n
from (select id, row_number() over (partition by store_id order by created_at desc) as n from public.categories) r
where c.id = r.id and c.sort_order = 0;

create index if not exists categories_store_order_idx on public.categories (store_id, sort_order);

select 'OK' as result;
