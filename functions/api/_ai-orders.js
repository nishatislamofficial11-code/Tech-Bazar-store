// Creates an order from an AI chat (underscore prefix = not a route).
// Prices, stock and delivery charge follow the same rules as the website checkout
// (public.create_checkout_order), so an AI order costs exactly what the website would charge.
import { rest, notifyStoreTelegram, escapeHtml } from './_store-lib.js';
import { sendOrderSms } from './_order-sms.js';

const PHONE = /^01[3-9]\d{8}$/;
const taka = (n) => `৳${Number(n || 0).toLocaleString('en-US')}`;

export function cleanPhone(raw) {
  const digits = String(raw || '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/\D/g, '');
  return digits.slice(-11);
}

// Finds the variant the customer asked for (by its option text, e.g. "XL" or "Black").
function matchVariant(product, option) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return { variant: null };
  const want = String(option || '').toLowerCase().split(/[\s,/|]+/).filter(Boolean);
  if (!want.length) return { error: 'সাইজ/রং বলা হয়নি' };
  const hit = variants.find((v) => {
    const text = JSON.stringify(v.options ?? v.attributes ?? v).toLowerCase();
    return want.every((w) => text.includes(w));
  });
  return hit ? { variant: hit } : { error: `"${option}" অপশন পাওয়া যায়নি` };
}

/**
 * order = { customer_name, phone, address, inside_dhaka, items: [{ code, quantity, option }] }
 * products = the list the AI was shown (P1 = products[0]).
 * Returns { ok: true, order } or { ok: false, reason }.
 */
export async function createAiOrder(cfg, store, conv, order, products) {
  const name = String(order?.customer_name || '').trim().slice(0, 80);
  const phone = cleanPhone(order?.phone);
  const address = String(order?.address || '').trim().slice(0, 300);
  if (name.length < 2) return { ok: false, reason: 'নাম পাওয়া যায়নি' };
  if (!PHONE.test(phone)) return { ok: false, reason: 'মোবাইল নম্বর সঠিক নয়' };
  if (address.length < 8) return { ok: false, reason: 'পুরো ঠিকানা পাওয়া যায়নি' };
  const wanted = (Array.isArray(order?.items) ? order.items : []).slice(0, 10);
  if (!wanted.length) return { ok: false, reason: 'কোন প্রোডাক্ট তা বোঝা যায়নি' };

  // Fresh prices and stock from the database (never trust what the AI wrote)
  const ids = [];
  for (const w of wanted) {
    const p = products[Number(String(w.code).replace(/\D/g, '')) - 1];
    if (!p?.id) return { ok: false, reason: `প্রোডাক্ট কোড ${w.code} পাওয়া যায়নি` };
    ids.push(p.id);
  }
  const fresh = await rest(cfg, `products?store_id=eq.${store.id}&id=in.(${[...new Set(ids)].join(',')})&select=id,title,price,stock,variants,is_delivery_free,delivery_charge`);
  const byId = Object.fromEntries((fresh || []).map((p) => [p.id, p]));
  const settingsRows = await rest(cfg, `settings?store_id=eq.${store.id}&key=in.(delivery_charge_type,flat_delivery_charge,delivery_charge_inside_dhaka,delivery_charge_outside_dhaka)&select=key,value`);
  const st = Object.fromEntries((settingsRows || []).map((r) => [r.key, r.value]));

  const lines = [];
  let subtotal = 0; let extra = 0; let maxShip = 0;
  let freeAll = true; let regular = false; let productShip = false;
  for (let i = 0; i < wanted.length; i++) {
    const p = byId[ids[i]];
    if (!p) return { ok: false, reason: 'প্রোডাক্ট পাওয়া যায়নি' };
    const qty = Math.max(1, Math.min(100, parseInt(wanted[i].quantity, 10) || 1));
    if (p.stock != null && Number(p.stock) < qty) return { ok: false, reason: `${p.title} স্টকে ${p.stock}টি আছে` };
    const { variant, error } = matchVariant(p, wanted[i].option);
    if (error) return { ok: false, reason: `${p.title}: ${error}` };
    const unit = Number(variant?.price ?? p.price) || 0;
    const vShip = Number(variant?.delivery_charge || 0);
    subtotal += unit * qty;
    extra += vShip * qty;
    freeAll = freeAll && Boolean(p.is_delivery_free);
    if (!p.is_delivery_free && vShip === 0) {
      regular = true;
      if (Number(p.delivery_charge) > 0) { productShip = true; maxShip = Math.max(maxShip, Number(p.delivery_charge)); }
    }
    lines.push({ p, qty, unit, variant });
  }
  let ship = 0;
  if (!freeAll) {
    ship = extra;
    if (regular) {
      ship += productShip ? maxShip
        : st.delivery_charge_type === 'flat' ? Number(st.flat_delivery_charge ?? 120)
          : order.inside_dhaka ? Number(st.delivery_charge_inside_dhaka || 0) : Number(st.delivery_charge_outside_dhaka || 0);
    }
  }
  ship = Math.round(ship * 100) / 100;
  const total = Math.round((subtotal + ship) * 100) / 100;

  const created = await rest(cfg, 'orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      store_id: store.id, total_amount: total, shipping_charge: ship, status: 'pending', order_source: 'ai_chat',
      payment_method: 'cod', advance_required: 0, customer_name: name, customer_phone: phone, customer_address: address,
      shipping_address: { name, phone, address, area: order.inside_dhaka ? 'inside_dhaka' : 'outside_dhaka' },
      order_note: `AI চ্যাট থেকে অর্ডার (${conv.channel})`,
    }),
  });
  const saved = created?.[0];
  if (!saved?.id) return { ok: false, reason: 'অর্ডার সেভ হয়নি' };
  await rest(cfg, 'order_items', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(lines.map((l) => ({
      order_id: saved.id, store_id: store.id, product_id: l.p.id, quantity: l.qty, price: l.unit,
      variant_sku: l.variant?.sku || null, variant_options: l.variant?.options || null,
    }))),
  });
  await rest(cfg, 'rpc/complete_order_inventory', { method: 'POST', body: JSON.stringify({ target_order: saved.id }) }).catch(() => null);
  await rest(cfg, `ai_conversations?id=eq.${conv.id}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ customer_name: name, customer_phone: phone }),
  }).catch(() => null);

  await sendOrderSms(cfg, store.id, saved.id, 'placed');
  const shortId = String(saved.id).slice(0, 8).toUpperCase();
  const itemsText = lines.map((l) => `${l.p.title} × ${l.qty}`).join(', ');
  await notifyStoreTelegram(cfg, store.id,
    `🛒 <b>AI চ্যাট থেকে নতুন অর্ডার</b> #${shortId}\n${escapeHtml(name)} · ${phone}\n${escapeHtml(address)}\n${escapeHtml(itemsText)}\nমোট: ${taka(total)} (ডেলিভারি ${taka(ship)})`).catch(() => 0);

  return {
    ok: true,
    order: { id: saved.id, shortId, total, ship, itemsText },
    message: `✅ অর্ডার হয়ে গেছে! অর্ডার নম্বর #${shortId}\n${itemsText}\nডেলিভারি চার্জ ${taka(ship)}, মোট ${taka(total)} (ক্যাশ অন ডেলিভারি)।\nআমাদের প্রতিনিধি শীঘ্রই ফোন করে কনফার্ম করবেন।`,
  };
}
