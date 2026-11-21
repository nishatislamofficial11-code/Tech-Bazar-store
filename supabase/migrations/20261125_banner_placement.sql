-- Banner placement (2026-11-25): the Fashion theme has a top banner slider and a middle banner.
-- Existing banners stay as top banners. Safe to run more than once. Deletes no data.
alter table public.banners add column if not exists placement text not null default 'hero';
alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check check (placement in ('hero', 'middle'));

select 'OK' as result;
