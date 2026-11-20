-- BACKUP taken 2026-11-20 before security changes (project tvfhsgokbwekpfyrmhbl, schema public).
-- Every public function as it was. Re-run any block to restore that function.

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user_id uuid, new_role text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE target public.profiles; BEGIN IF auth.uid() IS NULL OR NOT(public.is_super_admin() OR public.is_store_owner()) THEN RAISE EXCEPTION 'Owner permission required'; END IF; SELECT * INTO target FROM public.profiles WHERE id=target_user_id FOR UPDATE; IF NOT FOUND OR target_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.super_admins WHERE user_id=target_user_id) THEN RAISE EXCEPTION 'Protected account'; END IF; IF NOT public.is_super_admin() AND (target.store_id IS DISTINCT FROM public.current_store_id() OR target.role='admin') THEN RAISE EXCEPTION 'Store permission denied'; END IF; IF new_role NOT IN ('user','manager','blocked','demo') THEN RAISE EXCEPTION 'Invalid role'; END IF; UPDATE public.profiles SET role=new_role WHERE id=target_user_id; END $function$;

CREATE OR REPLACE FUNCTION public.can_sign_in_to_store(p_slug text)
  RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_store uuid;
  v_main uuid := public.main_store_id();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = v_uid) THEN RETURN true; END IF;
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    v_store := v_main;
  ELSE
    SELECT id INTO v_store FROM public.stores WHERE slug = btrim(p_slug);
    IF v_store IS NULL THEN RETURN false; END IF;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND store_id = v_store)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid
                 AND (store_id = v_store OR (store_id IS NULL AND v_store = v_main)))
      OR EXISTS (SELECT 1 FROM public.stores WHERE id = v_store AND admin_user_id = v_uid);
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_order_status(target_order uuid, token uuid)
  RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('id',id,'payment_status',payment_status,'advance_paid',advance_paid,'advance_required',advance_required,'total_amount',total_amount) FROM public.orders WHERE id=target_order AND checkout_token=token AND store_id=public.current_store_id() $function$;

CREATE OR REPLACE FUNCTION public.complete_order_inventory(target_order uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE o public.orders; i record; BEGIN SELECT * INTO o FROM public.orders WHERE id=target_order FOR UPDATE; IF NOT FOUND OR o.inventory_completed THEN RETURN; END IF; FOR i IN SELECT product_id,sum(quantity)::integer AS qty FROM public.order_items WHERE order_id=o.id GROUP BY product_id LOOP UPDATE public.products SET stock=greatest(0,coalesce(stock,100)-i.qty) WHERE id=i.product_id AND store_id=o.store_id; END LOOP; UPDATE public.orders SET inventory_completed=true WHERE id=o.id; END $function$;

CREATE OR REPLACE FUNCTION public.create_checkout_order(order_data jsonb, items_data jsonb, draft_id uuid DEFAULT NULL::uuid)
  RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE sid uuid:=public.current_store_id(); oid uuid:=gen_random_uuid(); p public.products; it jsonb; v jsonb; qty integer; unit numeric; subtotal numeric:=0; ship numeric; total numeric; advance numeric; method text:=coalesce(order_data->>'payment_method','cod'); methods jsonb; fixed numeric:=0; st jsonb; maxship numeric:=0; extra numeric:=0; regular boolean:=false; productship boolean:=false; freeall boolean:=true; result public.orders; BEGIN IF sid IS NULL OR NOT EXISTS(SELECT 1 FROM public.stores WHERE id=sid AND is_active) THEN RAISE EXCEPTION 'Store unavailable'; END IF; SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO st FROM public.settings WHERE store_id=sid; IF auth.uid() IS NULL AND coalesce(st->>'allow_guest_checkout','false')<>'true' THEN RAISE EXCEPTION 'Sign in required'; END IF; IF jsonb_typeof(items_data)<>'array' OR jsonb_array_length(items_data)=0 OR jsonb_array_length(items_data)>100 THEN RAISE EXCEPTION 'Invalid cart'; END IF; IF method NOT IN ('cod','delivery_advance','fixed_advance','full') THEN RAISE EXCEPTION 'Invalid payment method'; END IF; methods:=coalesce((st->>'payment_methods')::jsonb,'["cod"]'); IF NOT methods ? method THEN RAISE EXCEPTION 'Payment method unavailable'; END IF; FOR it IN SELECT value FROM jsonb_array_elements(items_data) LOOP SELECT * INTO p FROM public.products WHERE id=(it->>'product_id')::uuid AND store_id=sid; IF NOT FOUND THEN RAISE EXCEPTION 'Product belongs to another store'; END IF; qty:=(it->>'quantity')::integer; IF qty<1 OR qty>1000 OR coalesce(p.stock,100)<qty THEN RAISE EXCEPTION 'Product stock unavailable'; END IF; v:=NULL; IF nullif(it->>'variant_sku','') IS NOT NULL AND jsonb_array_length(coalesce(p.variants,'[]'))>0 THEN SELECT value INTO v FROM jsonb_array_elements(p.variants) WHERE value->>'sku'=it->>'variant_sku' LIMIT 1; IF v IS NULL THEN RAISE EXCEPTION 'Variant unavailable'; END IF; END IF; unit:=coalesce((v->>'price')::numeric,p.price); IF unit<0 OR round((it->>'price')::numeric,2)<>round(unit,2) THEN RAISE EXCEPTION 'Product price changed; refresh cart'; END IF; subtotal:=subtotal+unit*qty; extra:=extra+coalesce((v->>'delivery_charge')::numeric,0)*qty; freeall:=freeall AND coalesce(p.is_delivery_free,false); IF NOT coalesce(p.is_delivery_free,false) AND coalesce((v->>'delivery_charge')::numeric,0)=0 THEN regular:=true; IF coalesce(p.delivery_charge,0)>0 THEN productship:=true; maxship:=greatest(maxship,p.delivery_charge); END IF; END IF; END LOOP; ship:=0; IF NOT freeall THEN ship:=extra; IF regular THEN ship:=ship+CASE WHEN productship THEN maxship WHEN st->>'delivery_charge_type'='flat' THEN coalesce((st->>'flat_delivery_charge')::numeric,120) WHEN order_data->>'delivery_area'='inside_dhaka' THEN coalesce((st->>'delivery_charge_inside_dhaka')::numeric,0) ELSE coalesce((st->>'delivery_charge_outside_dhaka')::numeric,0) END; END IF; END IF; ship:=round(ship,2); total:=round(subtotal+ship,2); IF abs(total-(order_data->>'total_amount')::numeric)>0.01 OR abs(ship-(order_data->>'shipping_charge')::numeric)>0.01 THEN RAISE EXCEPTION 'Delivery or total changed; refresh checkout'; END IF; fixed:=coalesce((st->>'payment_fixed_advance')::numeric,0); advance:=CASE method WHEN 'cod' THEN 0 WHEN 'delivery_advance' THEN ship WHEN 'full' THEN total ELSE least(greatest(fixed,0),total) END; IF advance>0 AND NOT EXISTS(SELECT 1 FROM public.store_payment_gateways WHERE store_id=sid AND gateway=st->>'payment_gateway' AND is_active) THEN RAISE EXCEPTION 'Payment gateway not configured'; END IF; INSERT INTO public.orders(id,user_id,store_id,total_amount,shipping_charge,shipping_address,status,order_source,payment_method,advance_required,customer_name,customer_phone,customer_address,order_note) VALUES(oid,auth.uid(),sid,total,ship,order_data->'shipping_address','pending',order_data->>'order_source',method,advance,order_data->>'customer_name',order_data->>'customer_phone',order_data->>'customer_address',order_data->>'order_note') RETURNING * INTO result; FOR it IN SELECT value FROM jsonb_array_elements(items_data) LOOP INSERT INTO public.order_items(order_id,store_id,product_id,quantity,price,variant_sku,variant_options,variant_compare_price,variant_weight) VALUES(oid,sid,(it->>'product_id')::uuid,(it->>'quantity')::integer,(it->>'price')::numeric,it->>'variant_sku',it->'variant_options',nullif(it->>'variant_compare_price','')::numeric,nullif(it->>'variant_weight','')::numeric); END LOOP; IF advance=0 THEN PERFORM public.complete_order_inventory(oid); END IF; IF draft_id IS NOT NULL THEN DELETE FROM public.incomplete_orders WHERE id=draft_id AND store_id=sid; END IF; RETURN jsonb_build_object('id',oid,'checkout_token',result.checkout_token,'total_amount',total,'advance_required',advance,'shipping_charge',ship); END $function$;

-- create_store_with_admin: unchanged and long; current copy is in super-admin SQL history. Not modified by this work.

CREATE OR REPLACE FUNCTION public.current_store_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT CASE WHEN nullif(coalesce(current_setting('request.headers',true),'{}')::json->>'x-store','') IS NOT NULL THEN (SELECT id FROM public.stores WHERE slug=lower(coalesce(current_setting('request.headers',true),'{}')::json->>'x-store')) ELSE coalesce((SELECT store_id FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','manager','demo')),public.main_store_id()) END $function$;

CREATE OR REPLACE FUNCTION public.get_store_status(p_slug text)
  RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ select coalesce((select case when is_active then 'active' else 'inactive' end from public.stores where slug = lower(p_slug)), 'missing'); $function$;

CREATE OR REPLACE FUNCTION public.guard_payment_receipts()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF current_user NOT IN ('postgres','supabase_admin','service_role') THEN IF TG_OP='INSERT' THEN IF NEW.advance_paid<>0 OR NEW.cash_paid<>0 OR NEW.payment_status<>'unpaid' OR NEW.payment_transaction_id IS NOT NULL OR NEW.payment_paid_at IS NOT NULL THEN RAISE EXCEPTION 'Only verified settlement may record payment'; END IF; ELSIF NEW.advance_paid IS DISTINCT FROM OLD.advance_paid OR NEW.payment_status IS DISTINCT FROM OLD.payment_status OR NEW.payment_transaction_id IS DISTINCT FROM OLD.payment_transaction_id OR NEW.payment_gateway IS DISTINCT FROM OLD.payment_gateway OR NEW.payment_paid_at IS DISTINCT FROM OLD.payment_paid_at OR NEW.total_amount IS DISTINCT FROM OLD.total_amount OR NEW.advance_required IS DISTINCT FROM OLD.advance_required THEN RAISE EXCEPTION 'Payment fields are server managed'; END IF; END IF; RETURN NEW; END $function$;

CREATE OR REPLACE FUNCTION public.is_store_admin()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT EXISTS(SELECT 1 FROM public.user_roles r JOIN public.stores s ON s.id=r.store_id WHERE r.user_id=auth.uid() AND r.role IN ('admin','manager') AND r.store_id=public.current_store_id() AND s.is_active) $function$;

CREATE OR REPLACE FUNCTION public.main_store_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT id FROM public.stores ORDER BY created_at ASC,id ASC LIMIT 1 $function$;

CREATE OR REPLACE FUNCTION public.settle_verified_payment(target_order uuid, verified_amount numeric, gateway_name text, gateway_transaction text)
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE o public.orders; BEGIN SELECT * INTO o FROM public.orders WHERE id=target_order FOR UPDATE; IF NOT FOUND THEN RETURN false; END IF; IF o.payment_status IN ('paid','partial') THEN RETURN o.payment_transaction_id=gateway_transaction AND o.payment_gateway=gateway_name; END IF; IF verified_amount<=0 OR round(verified_amount,2)<>round(o.advance_required-o.advance_paid,2) THEN RETURN false; END IF; UPDATE public.orders SET advance_paid=advance_paid+verified_amount,payment_status=CASE WHEN advance_paid+verified_amount>=total_amount THEN 'paid' ELSE 'partial' END,payment_gateway=gateway_name,payment_transaction_id=gateway_transaction,payment_paid_at=now() WHERE id=o.id; PERFORM public.complete_order_inventory(o.id); RETURN true; END $function$;

CREATE OR REPLACE FUNCTION public.track_order_public(tracking_code text)
  RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('id',id,'status',status,'created_at',created_at,'total_amount',total_amount,'payment_status',payment_status,'advance_paid',advance_paid,'shipping_charge',shipping_charge,'courier_name',courier_name,'courier_status',courier_status,'courier_tracking_code',courier_tracking_code,'shipping_address','[TID:'||tracking_code||']','order_items','[]'::jsonb) FROM public.orders WHERE store_id=public.current_store_id() AND length(tracking_code)>=12 AND (id::text=tracking_code OR shipping_address#>>'{}' LIKE '%[TID:'||tracking_code||']%') LIMIT 1 $function$;

-- Grants at backup time (EXECUTE):
--  anon+authenticated: checkout_order_status, create_checkout_order, current_store_id, get_store_status,
--                      is_store_admin, is_super_admin, main_store_id, track_order_public
--  authenticated only: admin_set_user_role, can_sign_in_to_store, create_store_with_admin, is_store_owner,
--                      super_delete_store, super_update_store
--  service_role only:  settle_verified_payment, complete_order_inventory, sync_profile_permissions
