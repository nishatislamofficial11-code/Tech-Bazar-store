/**
 * Courier status webhook (Steadfast & Pathao): updates the order's delivery status automatically.
 * URL per store:  https://<site>/api/courier-webhook?store=<slug>
 * Auth: the store's own webhook token (Admin → Logistics), sent by the courier as
 *       "Authorization: Bearer <token>" (Steadfast) or "X-PATHAO-Signature: <token>" (Pathao).
 */
import { serverConfig, rest, resolveStore, storeSlugFromUrl } from './_store-lib.js';
import { sendOrderSms } from './_order-sms.js';

// Pathao checks for this fixed header when a webhook URL is first added
const PATHAO_INTEGRATION_SECRET = 'f3992ecc-59da-4cbe-a049-a13da2018d51';

function reply(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Pathao-Merchant-Webhook-Integration-Secret': PATHAO_INTEGRATION_SECRET },
  });
}

const clean = (v) => String(v ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);

// Same mapping the admin "Sync" button uses
function websiteStatus(courier, raw, current) {
  const s = raw.toLowerCase();
  if (courier === 'steadfast') {
    if (s === 'delivered' || s === 'partial_delivered') return 'delivered';
    if (s === 'cancelled') return 'cancelled';
    if (s === 'in_review' || s === 'pending' || s === 'hold') return 'processing';
    return current;
  }
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('cancel') || s.includes('return')) return 'cancelled';
  if (s.includes('in_transit') || s.includes('picked') || s.includes('pickup') || s.includes('dispatch')) return 'shipped';
  return current;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'GET') return reply({ status: 'ok' }, 202);
  if (request.method !== 'POST') return reply({ status: 'error', message: 'Method not allowed' }, 405);

  try {
    const cfg = serverConfig(context.env);
    const url = new URL(request.url);
    const slug = storeSlugFromUrl(url);
    if (!slug) return reply({ status: 'error', message: 'store missing' }, 400);
    const store = await resolveStore(cfg, slug, '');
    if (!store) return reply({ status: 'error', message: 'store not found' }, 404);

    const auth = request.headers.get('Authorization') || '';
    const given = (auth.startsWith('Bearer ') ? auth.slice(7) : '') || request.headers.get('X-PATHAO-Signature') || url.searchParams.get('token') || '';
    const rows = await rest(cfg, `settings?store_id=eq.${store.id}&key=eq.courier_webhook_token&select=value&limit=1`);
    const expected = String(rows?.[0]?.value || '');
    if (!expected || given.trim() !== expected) return reply({ status: 'error', message: 'unauthorized' }, 401);

    const p = await request.json().catch(() => null);
    if (!p || typeof p !== 'object') return reply({ status: 'error', message: 'invalid payload' }, 400);

    const consignment = clean(p.consignment_id);
    const tracking = clean(p.tracking_code);
    const invoice = clean(p.invoice || p.merchant_order_id);
    const rawStatus = String(p.delivery_status || p.order_status || p.status || p.event || '').slice(0, 60);
    if (!rawStatus || (!consignment && !tracking && !invoice)) return reply({ status: 'ignored' }, 202);

    const conds = [];
    if (consignment) conds.push(`courier_consignment_id.eq.${consignment}`);
    if (tracking) conds.push(`courier_tracking_code.eq.${tracking}`);
    if (invoice && /^[0-9a-f-]{36}$/i.test(invoice)) conds.push(`id.eq.${invoice}`);
    const orders = await rest(cfg, `orders?store_id=eq.${store.id}&or=(${conds.join(',')})&select=id,status,courier_name,courier_status&limit=1`);
    const order = orders?.[0];
    if (!order) return reply({ status: 'ignored', message: 'order not found' }, 202);

    const courier = order.courier_name || (p.notification_type ? 'steadfast' : 'pathao');
    const newStatus = websiteStatus(courier, rawStatus, order.status);
    if (rawStatus !== order.courier_status || newStatus !== order.status) {
      await rest(cfg, `orders?id=eq.${order.id}&store_id=eq.${store.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ courier_status: rawStatus, status: newStatus }),
      });
    }
    if (newStatus === 'shipped') await sendOrderSms(cfg, store.id, order.id, 'shipped');
    return reply({ status: 'success', order_status: newStatus }, 202);
  } catch (err) {
    return reply({ status: 'error', message: err.message || 'error' }, 500);
  }
}
