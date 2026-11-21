/**
 * Customer order SMS.
 *   POST /api/order-sms { store, action: 'placed', order_id, token }   → from the checkout page (token = checkout_token)
 *   POST /api/order-sms { store, action: 'placed'|'shipped', order_id } → shop staff (Authorization: Bearer <session>)
 *   POST /api/order-sms { store, action: 'test', phone }               → shop staff: test message
 */
import { serverConfig, rest, resolveStore } from './_store-lib.js';
import { sendOrderSms, storeSmsSettings, fillTemplate } from './_order-sms.js';
import { sendSms } from './_sms.js';

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const UUID = /^[0-9a-f-]{36}$/i;

async function isStaff(cfg, slug, authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const res = await fetch(`${cfg.url}/rest/v1/rpc/is_store_admin`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, Authorization: authHeader, 'Content-Type': 'application/json', 'x-store': slug },
    body: '{}',
  });
  return res.ok && (await res.json()) === true;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  try {
    const cfg = serverConfig(context.env);
    const body = await request.json().catch(() => ({}));
    const authHeader = request.headers.get('Authorization') || '';
    const store = await resolveStore(cfg, body.store, authHeader);
    if (!store?.is_active) return json({ ok: false, error: 'দোকান পাওয়া যায়নি' }, 404);

    if (body.action === 'test') {
      if (!(await isStaff(cfg, store.slug, authHeader))) return json({ ok: false, error: 'অনুমতি নেই' }, 403);
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-11);
      if (!/^01[3-9]\d{8}$/.test(phone)) return json({ ok: false, error: 'সঠিক মোবাইল নম্বর দিন' }, 400);
      const conf = await storeSmsSettings(cfg, store.id);
      if (!conf.sms.apiKey || !conf.sms.senderId) return json({ ok: false, error: 'আগে SMS API Key আর Sender ID সেভ করুন' }, 400);
      const sample = { id: 'TEST1234abcd', customer_name: 'রহিম', total_amount: 2150, courier_name: 'steadfast', courier_tracking_code: 'TRK123' };
      await sendSms(conf.sms, phone, fillTemplate(conf.text.placed, sample, conf.shop));
      return json({ ok: true });
    }

    const orderId = String(body.order_id || '');
    if (!UUID.test(orderId)) return json({ ok: false, error: 'invalid order' }, 400);
    const kind = body.action;
    if (kind !== 'placed' && kind !== 'shipped') return json({ ok: false, error: 'Unknown action' }, 400);

    let allowed = false;
    if (kind === 'placed' && UUID.test(String(body.token || ''))) {
      const rows = await rest(cfg, `orders?id=eq.${orderId}&store_id=eq.${store.id}&checkout_token=eq.${body.token}&select=id&limit=1`);
      allowed = Boolean(rows?.length);
    }
    if (!allowed) allowed = await isStaff(cfg, store.slug, authHeader);
    if (!allowed) return json({ ok: false, error: 'অনুমতি নেই' }, 403);

    const work = sendOrderSms(cfg, store.id, orderId, kind);
    context.waitUntil?.(work);
    const result = await work;
    return json({ ok: true, ...result });
  } catch (err) {
    return json({ ok: false, error: err?.message || 'সমস্যা হয়েছে' }, 500);
  }
}
