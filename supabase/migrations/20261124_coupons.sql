-- Coupon / discount codes per shop (2026-11-24). Safe to run more than once. Deletes no data.
-- Discounts apply to the product subtotal (not delivery). The server recalculates every discount.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null default public.current_store_id() references public.stores(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_type text not null default 'percent' check (discount_type in ('percent','fixed')),
  value numeric not null check (value > 0),
  min_order numeric not null default 0 check (min_order >= 0),
  max_discount numeric check (max_discount is null or max_discount > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, code),
  check (discount_type <> 'percent' or value <= 100)
);
alter table public.coupons enable row level security;
drop policy if exists shop_staff_all on public.coupons;
create policy shop_staff_all on public.coupons for all to authenticated
  using (store_id = public.current_store_id() and public.is_store_admin())
  with check (store_id = public.current_store_id() and public.is_store_admin());
revoke all on public.coupons from anon;
grant select, insert, update, delete on public.coupons to authenticated;

alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_amount numeric not null default 0;

-- Works out the discount for a code on a subtotal. Internal helper (not callable from the browser).
create or replace function public.coupon_discount(p_store uuid, p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.coupons; d numeric;
begin
  select * into c from public.coupons where store_id = p_store and code = upper(btrim(coalesce(p_code, '')));
  if not found or not c.is_active then return jsonb_build_object('ok', false, 'message', 'এই কুপন কোড সঠিক নয়'); end if;
  if c.starts_at is not null and now() < c.starts_at then return jsonb_build_object('ok', false, 'message', 'এই কুপন এখনো চালু হয়নি'); end if;
  if c.ends_at is not null and now() > c.ends_at then return jsonb_build_object('ok', false, 'message', 'এই কুপনের মেয়াদ শেষ'); end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then return jsonb_build_object('ok', false, 'message', 'এই কুপন আর ব্যবহার করা যাবে না'); end if;
  if coalesce(p_subtotal, 0) < c.min_order then
    return jsonb_build_object('ok', false, 'message', 'এই কুপনের জন্য কমপক্ষে ৳' || trim(to_char(c.min_order, 'FM999999990.##')) || ' কেনাকাটা করতে হবে');
  end if;
  d := case when c.discount_type = 'percent' then round(p_subtotal * c.value / 100, 2) else c.value end;
  if c.max_discount is not null then d := least(d, c.max_discount); end if;
  d := least(d, p_subtotal);
  return jsonb_build_object('ok', true, 'code', c.code, 'discount', d, 'type', c.discount_type, 'value', c.value);
end $$;
revoke all on function public.coupon_discount(uuid, text, numeric) from public, anon, authenticated;

-- Called by the checkout page to show the discount before ordering
create or replace function public.check_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sid uuid := public.current_store_id();
begin
  if sid is null then return jsonb_build_object('ok', false, 'message', 'দোকান পাওয়া যায়নি'); end if;
  if length(coalesce(p_code, '')) > 30 then return jsonb_build_object('ok', false, 'message', 'এই কুপন কোড সঠিক নয়'); end if;
  return public.coupon_discount(sid, p_code, p_subtotal);
end $$;
revoke all on function public.check_coupon(text, numeric) from public;
grant execute on function public.check_coupon(text, numeric) to anon, authenticated;

-- Checkout: same as before, plus an optional coupon (order_data.coupon_code)
create or replace function public.create_checkout_order(order_data jsonb, items_data jsonb, draft_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $function$
DECLARE sid uuid:=public.current_store_id(); oid uuid:=gen_random_uuid(); p public.products; it jsonb; v jsonb; qty integer; unit numeric; subtotal numeric:=0; ship numeric; total numeric; advance numeric; method text:=coalesce(order_data->>'payment_method','cod'); methods jsonb; fixed numeric:=0; st jsonb; maxship numeric:=0; extra numeric:=0; regular boolean:=false; productship boolean:=false; freeall boolean:=true; result public.orders;
  ccode text:=nullif(upper(btrim(coalesce(order_data->>'coupon_code',''))),''); cres jsonb; discount numeric:=0;
BEGIN
  IF sid IS NULL OR NOT public.store_is_open(sid) THEN RAISE EXCEPTION 'Store unavailable'; END IF;
  SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO st FROM public.settings WHERE store_id=sid;
  IF auth.uid() IS NULL AND coalesce(st->>'allow_guest_checkout','false')<>'true' THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF jsonb_typeof(items_data)<>'array' OR jsonb_array_length(items_data)=0 OR jsonb_array_length(items_data)>100 THEN RAISE EXCEPTION 'Invalid cart'; END IF;
  IF method NOT IN ('cod','delivery_advance','fixed_advance','full') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  methods:=coalesce((st->>'payment_methods')::jsonb,'["cod"]');
  IF NOT methods ? method THEN RAISE EXCEPTION 'Payment method unavailable'; END IF;
  FOR it IN SELECT value FROM jsonb_array_elements(items_data) LOOP
    SELECT * INTO p FROM public.products WHERE id=(it->>'product_id')::uuid AND store_id=sid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product belongs to another store'; END IF;
    qty:=(it->>'quantity')::integer;
    IF qty<1 OR qty>1000 OR coalesce(p.stock,100)<qty THEN RAISE EXCEPTION 'Product stock unavailable'; END IF;
    v:=NULL;
    IF nullif(it->>'variant_sku','') IS NOT NULL AND jsonb_array_length(coalesce(p.variants,'[]'))>0 THEN
      SELECT value INTO v FROM jsonb_array_elements(p.variants) WHERE value->>'sku'=it->>'variant_sku' LIMIT 1;
      IF v IS NULL THEN RAISE EXCEPTION 'Variant unavailable'; END IF;
    END IF;
    unit:=coalesce((v->>'price')::numeric,p.price);
    IF unit<0 OR round((it->>'price')::numeric,2)<>round(unit,2) THEN RAISE EXCEPTION 'Product price changed; refresh cart'; END IF;
    subtotal:=subtotal+unit*qty;
    extra:=extra+coalesce((v->>'delivery_charge')::numeric,0)*qty;
    freeall:=freeall AND coalesce(p.is_delivery_free,false);
    IF NOT coalesce(p.is_delivery_free,false) AND coalesce((v->>'delivery_charge')::numeric,0)=0 THEN
      regular:=true;
      IF coalesce(p.delivery_charge,0)>0 THEN productship:=true; maxship:=greatest(maxship,p.delivery_charge); END IF;
    END IF;
  END LOOP;
  ship:=0;
  IF NOT freeall THEN
    ship:=extra;
    IF regular THEN
      ship:=ship+CASE WHEN productship THEN maxship WHEN st->>'delivery_charge_type'='flat' THEN coalesce((st->>'flat_delivery_charge')::numeric,120) WHEN order_data->>'delivery_area'='inside_dhaka' THEN coalesce((st->>'delivery_charge_inside_dhaka')::numeric,0) ELSE coalesce((st->>'delivery_charge_outside_dhaka')::numeric,0) END;
    END IF;
  END IF;
  ship:=round(ship,2);
  IF ccode IS NOT NULL THEN
    PERFORM 1 FROM public.coupons WHERE store_id=sid AND code=ccode FOR UPDATE;
    cres:=public.coupon_discount(sid, ccode, subtotal);
    IF NOT coalesce((cres->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Coupon: %', cres->>'message'; END IF;
    discount:=round((cres->>'discount')::numeric,2);
  END IF;
  total:=round(subtotal+ship-discount,2);
  IF abs(total-(order_data->>'total_amount')::numeric)>0.01 OR abs(ship-(order_data->>'shipping_charge')::numeric)>0.01 THEN RAISE EXCEPTION 'Delivery or total changed; refresh checkout'; END IF;
  fixed:=coalesce((st->>'payment_fixed_advance')::numeric,0);
  advance:=CASE method WHEN 'cod' THEN 0 WHEN 'delivery_advance' THEN ship WHEN 'full' THEN total ELSE least(greatest(fixed,0),total) END;
  IF advance>0 AND NOT EXISTS(SELECT 1 FROM public.store_payment_gateways WHERE store_id=sid AND gateway=st->>'payment_gateway' AND is_active) THEN RAISE EXCEPTION 'Payment gateway not configured'; END IF;
  INSERT INTO public.orders(id,user_id,store_id,total_amount,shipping_charge,shipping_address,status,order_source,payment_method,advance_required,customer_name,customer_phone,customer_address,order_note,coupon_code,discount_amount)
  VALUES(oid,auth.uid(),sid,total,ship,order_data->'shipping_address','pending',order_data->>'order_source',method,advance,order_data->>'customer_name',order_data->>'customer_phone',order_data->>'customer_address',order_data->>'order_note',CASE WHEN discount>0 THEN ccode END,discount)
  RETURNING * INTO result;
  IF discount>0 THEN UPDATE public.coupons SET used_count=used_count+1 WHERE store_id=sid AND code=ccode; END IF;
  FOR it IN SELECT value FROM jsonb_array_elements(items_data) LOOP
    INSERT INTO public.order_items(order_id,store_id,product_id,quantity,price,variant_sku,variant_options,variant_compare_price,variant_weight)
    VALUES(oid,sid,(it->>'product_id')::uuid,(it->>'quantity')::integer,(it->>'price')::numeric,it->>'variant_sku',it->'variant_options',nullif(it->>'variant_compare_price','')::numeric,nullif(it->>'variant_weight','')::numeric);
  END LOOP;
  IF advance=0 THEN PERFORM public.complete_order_inventory(oid); END IF;
  IF draft_id IS NOT NULL THEN DELETE FROM public.incomplete_orders WHERE id=draft_id AND store_id=sid; END IF;
  RETURN jsonb_build_object('id',oid,'checkout_token',result.checkout_token,'total_amount',total,'advance_required',advance,'shipping_charge',ship,'discount_amount',discount);
END $function$;

select 'OK' as result;
