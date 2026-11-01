create or replace function public.super_update_store(
  p_store_id uuid, p_store_name text, p_admin_email text, p_new_password text default null)
returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_old text;
  v_email text := lower(trim(p_admin_email));
  v_user uuid;
begin
  if not exists (select 1 from public.super_admins where user_id = auth.uid()) then
    raise exception 'শুধু সুপার এডমিন পরিবর্তন করতে পারবে';
  end if;
  select admin_email into v_old from public.stores where id = p_store_id;
  if not found then raise exception 'স্টোর পাওয়া যায়নি'; end if;
  if v_email = '' then raise exception 'ইমেইল দিন'; end if;

  select id into v_user from public.profiles where store_id = p_store_id and role = 'admin' limit 1;
  if v_user is null and v_old is not null then
    select id into v_user from auth.users where lower(email) = lower(v_old) limit 1;
  end if;
  if v_user is null then raise exception 'এই স্টোরের মালিকের একাউন্ট পাওয়া যায়নি'; end if;

  if v_email <> lower(coalesce(v_old, '')) then
    if exists (select 1 from auth.users where lower(email) = v_email and id <> v_user) then
      raise exception 'এই ইমেইল দিয়ে আগে থেকেই অন্য একাউন্ট আছে';
    end if;
    update auth.users set email = v_email, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = v_user;
    update auth.identities set identity_data = identity_data || jsonb_build_object('email', v_email)
      where user_id = v_user and provider = 'email';
    update public.profiles set email = v_email where id = v_user;
  end if;

  if p_new_password is not null and length(p_new_password) > 0 then
    if length(p_new_password) < 6 then raise exception 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর'; end if;
    update auth.users set encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = now() where id = v_user;
  end if;

  update public.stores set name = coalesce(nullif(trim(p_store_name), ''), name), admin_email = v_email where id = p_store_id;
  update public.profiles set role = 'admin', store_id = p_store_id where id = v_user;
end $$;
grant execute on function public.super_update_store(uuid, text, text, text) to authenticated;

select 'OK' as result;
