-- Cloud Commerce: self sign-up, 30-day trial, subscription lock (2026-11-21)
-- Safe to run more than once. Deletes no data. Existing stores stay 'active' with no end date, so nothing gets locked.
-- Backup of earlier functions/policies: backups/2026-11-20-*.sql

-- 1. Subscription fields on stores
alter table public.stores
  add column if not exists status text not null default 'active',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists paid_until timestamptz,
  add column if not exists owner_name text,
  add column if not exists owner_phone text,
  add column if not exists business_type text,
  add column if not exists signup_source text not null default 'super_admin';
do $$ begin
  alter table public.stores add constraint stores_status_check
    check (status in ('pending','trial','active','expired','suspended','rejected'));
exception when duplicate_object then null; end $$;
create unique index if not exists stores_owner_phone_uniq on public.stores(owner_phone) where owner_phone is not null;

-- Visitors may read only a store's public identity (owner email/phone stay private)
revoke select on public.stores from anon, authenticated;
grant select (id, name, slug, is_active, status, created_at) on public.stores to anon, authenticated;

-- 2. Platform-wide settings (sign-up mode, trial length, plan)
create table if not exists public.platform_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
drop policy if exists platform_public_read on public.platform_settings;
create policy platform_public_read on public.platform_settings for select to anon, authenticated
  using (key not like 'private\_%');
drop policy if exists platform_super_write on public.platform_settings;
create policy platform_super_write on public.platform_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
insert into public.platform_settings(key, value) values
  ('signup_mode','auto'), ('trial_days','30'), ('plan_name','Cloud Commerce'), ('plan_price',''),
  ('phone_verification','on')
on conflict (key) do nothing;

-- 3. Is a store open to customers right now?
create or replace function public.store_is_open(p_store uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store and s.is_active and (
      (s.status = 'trial'  and (s.trial_ends_at is null or s.trial_ends_at > now())) or
      (s.status = 'active' and (s.paid_until   is null or s.paid_until   > now()))
    ))
$$;
grant execute on function public.store_is_open(uuid) to anon, authenticated;

-- Storefront gate: an expired or unpaid store shows as closed to customers
create or replace function public.get_store_status(p_slug text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when public.store_is_open(id) then 'active' else 'inactive' end
       from public.stores where slug = lower(p_slug)),
    'missing')
$$;

-- Checkout refuses new orders when the store is not open (only change: the first store check)
CREATE OR REPLACE FUNCTION public.create_checkout_order(order_data jsonb, items_data jsonb, draft_id uuid DEFAULT NULL::uuid)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE sid uuid:=public.current_store_id(); oid uuid:=gen_random_uuid(); p public.products; it jsonb; v jsonb; qty integer; unit numeric; subtotal numeric:=0; ship numeric; total numeric; advance numeric; method text:=coalesce(order_data->>'payment_method','cod'); methods jsonb; fixed numeric:=0; st jsonb; maxship numeric:=0; extra numeric:=0; regular boolean:=false; productship boolean:=false; freeall boolean:=true; result public.orders; BEGIN IF sid IS NULL OR NOT public.store_is_open(sid) THEN RAISE EXCEPTION 'Store unavailable'; END IF; SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO st FROM public.settings WHERE store_id=sid; IF auth.uid() IS NULL AND coalesce(st->>'allow_guest_checkout','false')<>'true' THEN RAISE EXCEPTION 'Sign in required'; END IF; IF jsonb_typeof(items_data)<>'array' OR jsonb_array_length(items_data)=0 OR jsonb_array_length(items_data)>100 THEN RAISE EXCEPTION 'Invalid cart'; END IF; IF method NOT IN ('cod','delivery_advance','fixed_advance','full') THEN RAISE EXCEPTION 'Invalid payment method'; END IF; methods:=coalesce((st->>'payment_methods')::jsonb,'["cod"]'); IF NOT methods ? method THEN RAISE EXCEPTION 'Payment method unavailable'; END IF; FOR it IN SELECT value FROM jsonb_array_elements(items_data) LOOP SELECT * INTO p FROM public.products WHERE id=(it->>'product_id')::uuid AND store_id=sid; IF NOT FOUND THEN RAISE EXCEPTION 'Product belongs to another store'; END IF; qty:=(it->>'quantity')::integer; IF qty<1 OR qty>1000 OR coalesce(p.stock,100)<qty THEN RAISE EXCEPTION 'Product stock unavailable'; END IF; v:=NULL; IF nullif(it->>'variant_sku','') IS NOT NULL AND jsonb_array_length(coalesce(p.variants,'[]'))>0 THEN SELECT value INTO v FROM jsonb_array_elements(p.variants) WHERE value->>'sku'=it->>'variant_sku' LIMIT 1; IF v IS NULL THEN RAISE EXCEPTION 'Variant unavailable'; END IF; END IF; unit:=coalesce((v->>'price')::numeric,p.price); IF unit<0 OR round((it->>'price')::numeric,2)<>round(unit,2) THEN RAISE EXCEPTION 'Product price changed; refresh cart'; END IF; subtotal:=subtotal+unit*qty; extra:=extra+coalesce((v->>'delivery_charge')::numeric,0)*qty; freeall:=freeall AND coalesce(p.is_delivery_free,false); IF NOT coalesce(p.is_delivery_free,false) AND coalesce((v->>'delivery_charge')::numeric,0)=0 THEN regular:=true; IF coalesce(p.delivery_charge,0)>0 THEN productship:=true; maxship:=greatest(maxship,p.delivery_charge); END IF; END IF; END LOOP; ship:=0; IF NOT freeall THEN ship:=extra; IF regular THEN ship:=ship+CASE WHEN productship THEN maxship WHEN st->>'delivery_charge_type'='flat' THEN coalesce((st->>'flat_delivery_charge')::numeric,120) WHEN order_data->>'delivery_area'='inside_dhaka' THEN coalesce((st->>'delivery_charge_inside_dhaka')::numeric,0) ELSE coalesce((st->>'delivery_charge_outside_dhaka')::numeric,0) END; END IF; END IF; ship:=round(ship,2); total:=round(subtotal+ship,2); IF abs(total-(order_data->>'total_amount')::numeric)>0.01 OR abs(ship-(order_data->>'shipping_charge')::numeric)>0.01 THEN RAISE EXCEPTION 'Delivery or total changed; refresh checkout'; END IF; fixed:=coalesce((st->>'payment_fixed_advance')::numeric,0); advance:=CASE method WHEN 'cod' THEN 0 WHEN 'delivery_advance' THEN ship WHEN 'full' THEN total ELSE least(greatest(fixed,0),total) END; IF advance>0 AND NOT EXISTS(SELECT 1 FROM public.store_payment_gateways WHERE store_id=sid AND gateway=st->>'payment_gateway' AND is_active) THEN RAISE EXCEPTION 'Payment gateway not configured'; END IF; INSERT INTO public.orders(id,user_id,store_id,total_amount,shipping_charge,shipping_address,status,order_source,payment_method,advance_required,customer_name,customer_phone,customer_address,order_note) VALUES(oid,auth.uid(),sid,total,ship,order_data->'shipping_address','pending',order_data->>'order_source',method,advance,order_data->>'customer_name',order_data->>'customer_phone',order_data->>'customer_address',order_data->>'order_note') RETURNING * INTO result; FOR it IN SELECT value FROM jsonb_array_elements(items_data) LOOP INSERT INTO public.order_items(order_id,store_id,product_id,quantity,price,variant_sku,variant_options,variant_compare_price,variant_weight) VALUES(oid,sid,(it->>'product_id')::uuid,(it->>'quantity')::integer,(it->>'price')::numeric,it->>'variant_sku',it->'variant_options',nullif(it->>'variant_compare_price','')::numeric,nullif(it->>'variant_weight','')::numeric); END LOOP; IF advance=0 THEN PERFORM public.complete_order_inventory(oid); END IF; IF draft_id IS NOT NULL THEN DELETE FROM public.incomplete_orders WHERE id=draft_id AND store_id=sid; END IF; RETURN jsonb_build_object('id',oid,'checkout_token',result.checkout_token,'total_amount',total,'advance_required',advance,'shipping_charge',ship); END $function$;

-- 4a. Phone verification codes (written only by the server; nobody can read them from the browser)
create table if not exists public.phone_otps (
  id bigserial primary key,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists phone_otps_phone_idx on public.phone_otps(phone, created_at desc);
create index if not exists phone_otps_ip_idx on public.phone_otps(ip, created_at desc);
alter table public.phone_otps enable row level security;
drop policy if exists "deny all client access" on public.phone_otps;
create policy "deny all client access" on public.phone_otps as permissive for all to anon, authenticated using (false) with check (false);
revoke all on public.phone_otps from anon, authenticated;

-- 4. Self sign-up: a signed-in user with a verified phone creates their own store
create or replace function public.merchant_create_store(
  p_store_name text, p_slug text, p_owner_name text, p_phone text, p_business_type text default null)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_email text; v_confirmed timestamptz;
  v_slug text := lower(btrim(coalesce(p_slug,'')));
  v_phone text := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  v_mode text; v_days int; v_status text; v_store uuid;
begin
  if v_uid is null then raise exception 'লগইন প্রয়োজন'; end if;
  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then raise exception 'আগে ইমেইল যাচাই করুন'; end if;
  if exists (select 1 from public.super_admins where user_id = v_uid) then
    raise exception 'সুপার এডমিন একাউন্ট দিয়ে দোকান খোলা যাবে না'; end if;
  if exists (select 1 from public.user_roles where user_id = v_uid and role in ('admin','manager','demo'))
     or exists (select 1 from public.stores where admin_user_id = v_uid) then
    raise exception 'এই একাউন্টে আগে থেকেই একটা দোকান আছে'; end if;
  if length(btrim(coalesce(p_store_name,''))) not between 2 and 80 then raise exception 'দোকানের নাম দিন (২-৮০ অক্ষর)'; end if;
  if length(btrim(coalesce(p_owner_name,''))) not between 2 and 80 then raise exception 'আপনার নাম দিন'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' then
    raise exception 'দোকানের লিংকে শুধু ইংরেজি ছোট অক্ষর, সংখ্যা আর - দেওয়া যাবে (৩-৪০ অক্ষর)'; end if;
  if v_slug = any (array['admin','api','www','app','merchant','super-admin','superadmin','platform','signin','signup',
      'login','logout','checkout','store','stores','shop','support','help','brand','mail','cloud','cloudcommerce','billing']) then
    raise exception 'এই লিংক নেওয়া যাবে না, অন্য নাম দিন'; end if;
  if exists (select 1 from public.stores where lower(slug) = v_slug) then raise exception 'এই লিংক আগে থেকেই নেওয়া, অন্য নাম দিন'; end if;
  v_phone := right(v_phone, 11);
  if v_phone !~ '^01[3-9][0-9]{8}$' then raise exception 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)'; end if;
  if exists (select 1 from public.stores where owner_phone = v_phone) then
    raise exception 'এই নম্বর দিয়ে আগেই একটা দোকান খোলা হয়েছে'; end if;
  if coalesce((select value from public.platform_settings where key = 'phone_verification'), 'on') = 'on'
     and not exists (select 1 from public.phone_otps where phone = v_phone and verified_at > now() - interval '2 hours') then
    raise exception 'আগে মোবাইল নম্বর যাচাই করুন'; end if;

  v_mode := coalesce((select value from public.platform_settings where key = 'signup_mode'), 'auto');
  v_days := coalesce(nullif((select value from public.platform_settings where key = 'trial_days'), '')::int, 30);
  v_status := case when v_mode = 'approval' then 'pending' else 'trial' end;

  insert into public.stores (name, slug, is_active, admin_email, admin_user_id, owner_name, owner_phone,
                             business_type, status, trial_ends_at, signup_source)
  values (btrim(p_store_name), v_slug, true, lower(v_email), v_uid, btrim(p_owner_name), v_phone,
          nullif(btrim(coalesce(p_business_type,'')), ''), v_status,
          case when v_status = 'trial' then now() + make_interval(days => v_days) end, 'self')
  returning id into v_store;

  insert into public.profiles (id, email, full_name, role, store_id)
  values (v_uid, lower(v_email), btrim(p_owner_name), 'admin', v_store)
  on conflict (id) do update set role = 'admin', store_id = v_store, full_name = excluded.full_name;

  insert into public.settings (key, value, store_id) values
    ('site_title', btrim(p_store_name), v_store),
    ('allow_guest_checkout', 'true', v_store)
  on conflict do nothing;

  return jsonb_build_object('store_id', v_store, 'slug', v_slug, 'status', v_status);
end $$;
revoke all on function public.merchant_create_store(text,text,text,text,text) from public, anon;
grant execute on function public.merchant_create_store(text,text,text,text,text) to authenticated;

-- Is a store link still free? (sign-up form check)
create or replace function public.store_slug_available(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select lower(btrim(coalesce(p_slug,''))) ~ '^[a-z0-9][a-z0-9-]{2,39}$'
     and not exists (select 1 from public.stores where lower(slug) = lower(btrim(p_slug)))
$$;
grant execute on function public.store_slug_available(text) to anon, authenticated;

-- 5. The signed-in owner's own store + subscription (central login redirect, billing banner)
create or replace function public.my_store()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'name', s.name, 'slug', s.slug, 'status', s.status, 'is_active', s.is_active,
    'trial_ends_at', s.trial_ends_at, 'paid_until', s.paid_until, 'open', public.store_is_open(s.id),
    'plan_name', (select value from public.platform_settings where key = 'plan_name'),
    'plan_price', (select value from public.platform_settings where key = 'plan_price'))
  from public.stores s
  join public.user_roles r on r.store_id = s.id
  where r.user_id = auth.uid() and r.role in ('admin','manager','demo')
  limit 1
$$;
revoke all on function public.my_store() from public, anon;
grant execute on function public.my_store() to authenticated;

-- 6. Super admin: full store list and subscription actions
create or replace function public.super_list_stores()
returns setof jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'শুধু সুপার এডমিন'; end if;
  return query
    select jsonb_build_object(
      'id', s.id, 'name', s.name, 'slug', s.slug, 'is_active', s.is_active, 'admin_email', s.admin_email,
      'created_at', s.created_at, 'status', s.status, 'trial_ends_at', s.trial_ends_at, 'paid_until', s.paid_until,
      'owner_name', s.owner_name, 'owner_phone', s.owner_phone, 'business_type', s.business_type,
      'signup_source', s.signup_source, 'open', public.store_is_open(s.id))
    from public.stores s order by s.created_at desc;
end $$;
revoke all on function public.super_list_stores() from public, anon;
grant execute on function public.super_list_stores() to authenticated;

create or replace function public.super_set_store_plan(p_store_id uuid, p_action text, p_days int default 30)
returns void language plpgsql security definer set search_path = public as $$
declare v_trial int;
begin
  if not public.is_super_admin() then raise exception 'শুধু সুপার এডমিন'; end if;
  if p_days is null or p_days not between 1 and 3660 then raise exception 'দিনের সংখ্যা সঠিক নয়'; end if;
  if not exists (select 1 from public.stores where id = p_store_id) then raise exception 'স্টোর পাওয়া যায়নি'; end if;
  v_trial := coalesce(nullif((select value from public.platform_settings where key = 'trial_days'), '')::int, 30);
  case p_action
    when 'approve' then
      update public.stores set status = 'trial', trial_ends_at = now() + make_interval(days => v_trial) where id = p_store_id;
    when 'reject' then
      update public.stores set status = 'rejected' where id = p_store_id;
    when 'extend_trial' then
      update public.stores set status = 'trial',
        trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => p_days) where id = p_store_id;
    when 'mark_paid' then
      update public.stores set status = 'active',
        paid_until = greatest(coalesce(paid_until, now()), now()) + make_interval(days => p_days) where id = p_store_id;
    when 'no_expiry' then
      update public.stores set status = 'active', paid_until = null where id = p_store_id;
    when 'expire' then
      update public.stores set status = 'expired' where id = p_store_id;
    else raise exception 'অজানা কাজ';
  end case;
end $$;
revoke all on function public.super_set_store_plan(uuid,text,int) from public, anon;
grant execute on function public.super_set_store_plan(uuid,text,int) to authenticated;

select 'OK' as result;
