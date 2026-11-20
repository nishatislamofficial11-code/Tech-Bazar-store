-- AI Automation add-on (2026-11-23): AI chat inbox, knowledge base, AI rules, monthly reply limit.
-- Each shop sees only its own data. Safe to run more than once. Deletes no data.

-- Per-shop AI behaviour (set by the shop owner)
create table if not exists public.ai_settings (
  store_id uuid primary key default public.current_store_id() references public.stores(id) on delete cascade,
  enabled boolean not null default false,
  bot_name text not null default 'Assistant',
  always_rules text[] not null default '{}',
  never_rules text[] not null default '{}',
  handoff_message text,
  away_message text,
  updated_at timestamptz not null default now()
);

-- Add-on switch and monthly limit per shop (set only by the super admin)
create table if not exists public.ai_store_plans (
  store_id uuid primary key references public.stores(id) on delete cascade,
  active boolean not null default false,
  monthly_limit int not null default 1000 check (monthly_limit >= 0),
  updated_at timestamptz not null default now()
);

-- Replies used per month (written only by the server)
create table if not exists public.ai_usage (
  store_id uuid not null references public.stores(id) on delete cascade,
  month text not null,
  replies int not null default 0,
  primary key (store_id, month)
);

-- Policies, FAQs and other answers the AI uses
create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
  category text not null default 'FAQ',
  title text not null check (length(title) between 1 and 200),
  content text not null check (length(content) between 1 and 5000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_knowledge_store_idx on public.ai_knowledge (store_id);

-- One conversation per customer per channel
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
  channel text not null check (channel in ('test','messenger','instagram','whatsapp')),
  external_id text not null,
  customer_name text,
  customer_phone text,
  status text not null default 'ai' check (status in ('ai','needs_human','assigned','resolved')),
  ai_paused boolean not null default false,
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_name text,
  handoff_reason text,
  summary text,
  sentiment text check (sentiment in ('positive','neutral','negative')),
  unread int not null default 0,
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (store_id, channel, external_id)
);
create index if not exists ai_conversations_list_idx on public.ai_conversations (store_id, last_message_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  store_id uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
  role text not null check (role in ('customer','ai','agent','system')),
  content text not null check (length(content) between 1 and 4000),
  agent_id uuid references auth.users(id) on delete set null,
  agent_name text,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);

-- Row level security: shop owner/manager of the current shop only (super admin can read)
alter table public.ai_settings enable row level security;
alter table public.ai_store_plans enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_knowledge enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ai_settings','ai_knowledge','ai_conversations','ai_messages'] loop
    execute format('drop policy if exists shop_staff_all on public.%I', t);
    execute format('create policy shop_staff_all on public.%I for all to authenticated
      using (store_id = public.current_store_id() and public.is_store_admin())
      with check (store_id = public.current_store_id() and public.is_store_admin())', t);
    execute format('drop policy if exists super_read on public.%I', t);
    execute format('create policy super_read on public.%I for select to authenticated using (public.is_super_admin())', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

drop policy if exists shop_read on public.ai_store_plans;
create policy shop_read on public.ai_store_plans for select to authenticated
  using ((store_id = public.current_store_id() and public.is_store_admin()) or public.is_super_admin());
drop policy if exists super_write on public.ai_store_plans;
create policy super_write on public.ai_store_plans for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
revoke all on public.ai_store_plans from anon;
grant select, insert, update, delete on public.ai_store_plans to authenticated;

drop policy if exists shop_read on public.ai_usage;
create policy shop_read on public.ai_usage for select to authenticated
  using ((store_id = public.current_store_id() and public.is_store_admin()) or public.is_super_admin());
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- Server only: count one AI reply if the shop has the add-on and is under its monthly limit
create or replace function public.ai_use_reply(p_store uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_limit int; v_month text := to_char(now() at time zone 'Asia/Dhaka', 'YYYY-MM'); v_used int;
begin
  select monthly_limit into v_limit from public.ai_store_plans where store_id = p_store and active;
  if v_limit is null then return false; end if;
  insert into public.ai_usage (store_id, month, replies) values (p_store, v_month, 0) on conflict do nothing;
  update public.ai_usage set replies = replies + 1
   where store_id = p_store and month = v_month and replies < v_limit
  returning replies into v_used;
  return v_used is not null;
end $$;
revoke all on function public.ai_use_reply(uuid) from public, anon, authenticated;
grant execute on function public.ai_use_reply(uuid) to service_role;

select 'OK' as result;
