-- AI chat on the shop website (2026-11-23). Safe to run more than once. Deletes no data.
alter table public.ai_conversations drop constraint if exists ai_conversations_channel_check;
alter table public.ai_conversations add constraint ai_conversations_channel_check
  check (channel in ('test','website','messenger','instagram','whatsapp'));
alter table public.ai_conversations add column if not exists visitor_ip text;
create index if not exists ai_conversations_ip_idx on public.ai_conversations (store_id, visitor_ip, created_at);
create index if not exists ai_messages_recent_idx on public.ai_messages (conversation_id, role, created_at);

select 'OK' as result;
