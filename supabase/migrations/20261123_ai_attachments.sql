-- Product photo cards in AI chat messages (2026-11-23). Safe to run more than once. Deletes no data.
alter table public.ai_messages add column if not exists attachments jsonb;

select 'OK' as result;
