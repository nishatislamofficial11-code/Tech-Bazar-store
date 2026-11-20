-- Super admin creates a store with the same details as the public sign-up (no SMS/email check). 2026-11-22
-- Safe to run more than once. Deletes no data.
create or replace function public.super_create_store(
  p_store_name text, p_slug text, p_owner_name text, p_phone text, p_business_type text,
  p_email text, p_password text, p_plan text default 'trial')
returns jsonb language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_slug text := lower(btrim(coalesce(p_slug,'')));
  v_phone text := right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 11);
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_days int; v_store uuid; v_user uuid;
begin
  if not public.is_super_admin() then raise exception 'শুধু সুপার এডমিন দোকান খুলতে পারবে'; end if;
  if length(btrim(coalesce(p_owner_name,''))) not between 2 and 80 then raise exception 'মালিকের নাম দিন'; end if;
  if v_phone !~ '^01[3-9][0-9]{8}$' then raise exception 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)'; end if;
  if exists (select 1 from public.stores where owner_phone = v_phone) then raise exception 'এই নম্বর দিয়ে আগেই একটা দোকান খোলা হয়েছে'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'সঠিক ইমেইল দিন'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'এই ইমেইল দিয়ে আগেই একাউন্ট খোলা আছে, অন্য ইমেইল দিন'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন'; end if;
  if length(btrim(coalesce(p_store_name,''))) not between 2 and 80 then raise exception 'দোকানের নাম দিন'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' then raise exception 'দোকানের লিংকে শুধু ইংরেজি ছোট অক্ষর, সংখ্যা আর - (৩-৪০ অক্ষর)'; end if;
  if v_slug = any (array['admin','api','www','app','merchant','super-admin','superadmin','platform','signin','signup',
      'login','logout','checkout','store','stores','shop','support','help','brand','mail','cloud','cloudcommerce','billing']) then
    raise exception 'এই লিংক নেওয়া যাবে না, অন্য নাম দিন'; end if;
  if exists (select 1 from public.stores where lower(slug) = v_slug) then raise exception 'এই লিংক আগে থেকেই নেওয়া, অন্য নাম দিন'; end if;
  if p_plan not in ('trial','no_expiry') then raise exception 'প্ল্যান সঠিক নয়'; end if;
  v_days := coalesce(nullif((select value from public.platform_settings where key = 'trial_days'), '')::int, 30);

  -- Owner login account (email already confirmed: the super admin vouches for it)
  v_user := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email,
          crypt(p_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name', btrim(p_owner_name), 'phone', v_phone), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user::text,
          jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());

  insert into public.stores (name, slug, is_active, admin_email, admin_user_id, owner_name, owner_phone,
                             business_type, status, trial_ends_at, paid_until, signup_source)
  values (btrim(p_store_name), v_slug, true, v_email, v_user, btrim(p_owner_name), v_phone,
          nullif(btrim(coalesce(p_business_type,'')), ''),
          case when p_plan = 'trial' then 'trial' else 'active' end,
          case when p_plan = 'trial' then now() + make_interval(days => v_days) end, null, 'super_admin')
  returning id into v_store;

  insert into public.profiles (id, email, full_name, role, store_id)
  values (v_user, v_email, btrim(p_owner_name), 'admin', v_store)
  on conflict (id) do update set role = 'admin', store_id = v_store, full_name = excluded.full_name;

  insert into public.settings (key, value, store_id) values
    ('site_title', btrim(p_store_name), v_store),
    ('allow_guest_checkout', 'true', v_store)
  on conflict do nothing;

  return jsonb_build_object('store_id', v_store, 'slug', v_slug);
end $$;
revoke all on function public.super_create_store(text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.super_create_store(text,text,text,text,text,text,text,text) to authenticated;

select 'OK' as result;
