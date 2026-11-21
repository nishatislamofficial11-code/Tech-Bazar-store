// SMS to a shop's customers about their order (underscore prefix = not a route).
// Messages go out through the Cloud Commerce BulkSMSBD account; each SMS part uses one of the
// shop's prepaid SMS credits (bought from Cloud Commerce, see Admin → SMS Setup).
import { rest } from './_store-lib.js';
import { sendSms, loadSmsConfig, smsConfigured } from './_sms.js';

// Bangla (unicode) SMS: 70 characters, or 67 per part when longer; plain English: 160 / 153
export function smsParts(text) {
  const t = String(text || '');
  const unicode = /[^\x00-\x7F]/.test(t);
  const single = unicode ? 70 : 160; const multi = unicode ? 67 : 153;
  return t.length <= single ? 1 : Math.ceil(t.length / multi);
}

// Takes credits, sends, and gives the credits back if sending failed
export async function sendPaidSms(cfg, storeId, phone, message, reason) {
  const sms = await loadSmsConfig(cfg);
  if (!smsConfigured(sms)) throw new Error('SMS সার্ভিস এখনো চালু হয়নি');
  const parts = smsParts(message);
  const ok = await rest(cfg, 'rpc/sms_use', { method: 'POST', body: JSON.stringify({ p_store: storeId, p_count: parts, p_reason: reason }) });
  if (ok !== true) throw new Error('SMS ব্যালান্স শেষ। Admin → SMS Setup থেকে SMS কিনুন');
  try {
    await sendSms(sms, phone, message);
  } catch (err) {
    await rest(cfg, 'rpc/sms_refund', { method: 'POST', body: JSON.stringify({ p_store: storeId, p_count: parts, p_reason: `refund: ${reason}` }) }).catch(() => null);
    throw err;
  }
  return parts;
}

export const DEFAULT_TEMPLATES = {
  placed: '{shop}: প্রিয় {name}, আপনার অর্ডার #{order} পেয়েছি। মোট ৳{total}। ধন্যবাদ!',
  shipped: '{shop}: আপনার অর্ডার #{order} কুরিয়ারে পাঠানো হয়েছে। {courier} ট্র্যাকিং: {tracking}',
};

export async function storeSmsSettings(cfg, storeId) {
  const rows = await rest(cfg, `settings?store_id=eq.${storeId}&key=in.(site_title,customer_sms_placed,customer_sms_shipped,customer_sms_placed_text,customer_sms_shipped_text)&select=key,value`);
  const s = Object.fromEntries((rows || []).map((r) => [r.key, String(r.value || '')]));
  return {
    shop: s.site_title?.trim() || '',
    on: { placed: s.customer_sms_placed === 'true', shipped: s.customer_sms_shipped === 'true' },
    text: { placed: s.customer_sms_placed_text?.trim() || DEFAULT_TEMPLATES.placed, shipped: s.customer_sms_shipped_text?.trim() || DEFAULT_TEMPLATES.shipped },
  };
}

export function fillTemplate(template, order, shop) {
  const vals = {
    shop: shop || '',
    name: String(order.customer_name || '').trim().split(/\s+/)[0] || 'গ্রাহক',
    order: String(order.id || '').slice(0, 8).toUpperCase(),
    total: Number(order.total_amount || 0).toLocaleString('en-US'),
    courier: order.courier_name ? (order.courier_name === 'steadfast' ? 'Steadfast' : order.courier_name === 'pathao' ? 'Pathao' : order.courier_name) : '',
    tracking: order.courier_tracking_code || order.courier_consignment_id || '',
  };
  return template.replace(/\{(shop|name|order|total|courier|tracking)\}/g, (_, k) => vals[k]).replace(/\s+/g, ' ').trim().slice(0, 600);
}

/**
 * Sends the 'placed' or 'shipped' SMS for an order once (orders.sms_sent remembers what was sent).
 * Returns { sent: boolean, reason?: string }. Never throws.
 */
export async function sendOrderSms(cfg, storeId, orderId, kind) {
  try {
    if (!['placed', 'shipped'].includes(kind)) return { sent: false, reason: 'unknown kind' };
    const conf = await storeSmsSettings(cfg, storeId);
    if (!conf.on[kind]) return { sent: false, reason: 'off' };
    const rows = await rest(cfg, `orders?id=eq.${orderId}&store_id=eq.${storeId}&select=id,customer_name,customer_phone,total_amount,courier_name,courier_tracking_code,courier_consignment_id,sms_sent&limit=1`);
    const order = rows?.[0];
    if (!order) return { sent: false, reason: 'order not found' };
    if ((order.sms_sent || []).includes(kind)) return { sent: false, reason: 'already sent' };
    const phone = String(order.customer_phone || '').replace(/\D/g, '').slice(-11);
    if (!/^01[3-9]\d{8}$/.test(phone)) return { sent: false, reason: 'bad phone' };
    // Mark first so two quick calls can't both send
    await rest(cfg, `orders?id=eq.${orderId}&store_id=eq.${storeId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ sms_sent: [...(order.sms_sent || []), kind] }),
    });
    try {
      await sendPaidSms(cfg, storeId, phone, fillTemplate(conf.text[kind], order, conf.shop), `order ${kind}`);
    } catch (err) {
      // Not sent: forget the mark so it can be tried again
      await rest(cfg, `orders?id=eq.${orderId}&store_id=eq.${storeId}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ sms_sent: order.sms_sent || [] }),
      }).catch(() => null);
      throw err;
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: String(err?.message || err).slice(0, 200) };
  }
}
