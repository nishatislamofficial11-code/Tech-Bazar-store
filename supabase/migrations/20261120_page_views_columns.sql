-- Visitor tracking fix (2026-11-20). The site saves `url` and `product_id`, but the table never had
-- these columns, so every visit was rejected and analytics stayed empty. Adds columns only; deletes nothing.
alter table public.page_views add column if not exists url text;
alter table public.page_views add column if not exists product_id uuid;
create index if not exists page_views_store_created_idx on public.page_views(store_id, created_at desc);

select 'OK' as result;
