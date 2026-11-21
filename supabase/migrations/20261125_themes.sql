-- Themes (2026-11-25): banner placement (top or middle) and an optional product card badge.
-- Existing banners stay as top banners; existing products keep the automatic badge.
-- Safe to run more than once. Deletes no data.
alter table public.banners add column if not exists placement text not null default 'hero';
alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check check (placement in ('hero', 'middle'));

alter table public.products add column if not exists badge text;
alter table public.products drop constraint if exists products_badge_check;
alter table public.products add constraint products_badge_check check (badge is null or badge in ('new', 'hot', 'sale', 'exclusive', 'none'));

select 'OK' as result;
