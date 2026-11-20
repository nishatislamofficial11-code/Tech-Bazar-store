import { money, validateSettlement, verifyPayment, isAttemptId } from './_payment-lib.js';
import { serverConfig, rest, notifyStoreTelegram, escapeHtml } from './_store-lib.js';

async function readParams(request) {
  const url = new URL(request.url);
  const params = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        const body = await request.json();
        for (const [k, v] of Object.entries(body || {})) params[k] = String(v);
      } else {
        const form = await request.formData();
        form.forEach((v, k) => { params[k] = String(v); });
      }
    } catch { /* ignore body parse errors */ }
  }
  return params;
}

// Sends the customer back to their own store with the result.
function redirectTo(requestUrl, storeSlug, orderId, outcome) {
  const qs = new URLSearchParams({ payment: outcome });
  if (storeSlug) qs.set('store', storeSlug);
  if (orderId) qs.set('order', orderId);
  return Response.redirect(new URL(`/?${qs.toString()}`, requestUrl).toString(), 303);
}

async function sendPaidNotification(cfg, order, gateway, amount, transaction) {
  const items = await rest(cfg, `order_items?order_id=eq.${order.id}&select=quantity,price,variant_options,products(title)`);
  const lines = (items || []).map((i) => {
    let title = escapeHtml(i.products?.title || 'Product');
    if (i.variant_options && typeof i.variant_options === 'object') {
      title += ` (${escapeHtml(Object.entries(i.variant_options).map(([k, v]) => `${k}: ${v}`).join(', '))})`;
    }
    return `  • <b>${title}</b> (x${i.quantity}) - ৳${(Number(i.price) * Number(i.quantity)).toFixed(2)}`;
  }).join('\n') || '  • Item details not found';
  const due = Math.max(0, Number(order.total_amount || 0) - Number(order.advance_paid || 0) - amount);
  const time = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });
  const message = `<b>🛒 NEW ORDER — ✅ ONLINE PAYMENT RECEIVED</b>

${escapeHtml(typeof order.shipping_address === 'string' ? order.shipping_address : '')}

<b>📦 Purchased Products:</b>
${lines}

<b>💳 Paid online:</b> ৳${amount.toFixed(2)} (${escapeHtml(gateway)}, ${escapeHtml(transaction)})
<b>💰 Order total:</b> ৳${Number(order.total_amount || 0).toFixed(2)}
<b>🧾 Due on delivery:</b> ৳${due.toFixed(2)}
<b>🕒 Time (BD):</b> ${time}`;
  await notifyStoreTelegram(cfg, order.store_id, message);
}

async function handle(context) {
  const params = await readParams(context.request);
  const gateway = params['gateway'];
  const status = params['status'] || '';
  const attemptId = params['tran_id'] || params['mer_txnid'] || params['MerchantTransactionId'] || params['merchantTransactionId'] || '';

  if (!['sslcommerz', 'eps', 'aamarpay'].includes(gateway) || !isAttemptId(attemptId)) {
    return redirectTo(context.request.url, '', '', 'failed');
  }

  let cfg;
  try {
    cfg = serverConfig(context.env);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const attempts = await rest(cfg, `payment_attempts?id=eq.${attemptId}&select=id,order_id,store_id,gateway,stores(slug)&limit=1`);
  const attempt = attempts?.[0];
  if (!attempt || attempt.gateway !== gateway) return redirectTo(context.request.url, '', '', 'failed');
  const storeSlug = attempt.stores?.slug || '';

  const orders = await rest(cfg, `orders?id=eq.${attempt.order_id}&store_id=eq.${attempt.store_id}&select=id,store_id,total_amount,advance_required,advance_paid,payment_status,payment_transaction_id,shipping_address&limit=1`);
  const order = orders?.[0];
  if (!order) return redirectTo(context.request.url, storeSlug, '', 'failed');

  if (status === 'cancelled') return redirectTo(context.request.url, storeSlug, order.id, 'cancelled');
  if (status === 'failed') return redirectTo(context.request.url, storeSlug, order.id, 'failed');

  // Already settled (e.g. IPN arrived before the customer's redirect)
  if (order.payment_status === 'paid' || order.payment_status === 'partial') {
    return redirectTo(context.request.url, storeSlug, order.id, 'success');
  }

  try {
    const gwRows = await rest(cfg, `store_payment_gateways?store_id=eq.${order.store_id}&gateway=eq.${gateway}&select=credentials&limit=1`);
    const credentials = gwRows?.[0]?.credentials;
    if (!credentials) return redirectTo(context.request.url, storeSlug, order.id, 'failed');
    const envRows = await rest(cfg, `settings?store_id=eq.${order.store_id}&key=eq.payment_environment&select=value&limit=1`);
    const config = { gateway, environment: envRows?.[0]?.value === 'live' ? 'live' : 'sandbox', credentials };

    // Ask the gateway itself whether the money really arrived
    const verified = await verifyPayment(config, params);
    const expected = money(Number(order.advance_required || 0) - Number(order.advance_paid || 0));
    const ok = validateSettlement(
      { transaction: attempt.id, amount: expected, currency: 'BDT', store: order.store_id },
      { transaction: verified.transaction, amount: verified.amount, currency: verified.currency, store: order.store_id, successful: verified.successful },
    );
    if (!ok) return redirectTo(context.request.url, storeSlug, order.id, 'failed');

    const settled = await rest(cfg, 'rpc/settle_verified_payment', {
      method: 'POST',
      body: JSON.stringify({ target_order: order.id, verified_amount: verified.amount, gateway_name: gateway, gateway_transaction: verified.gatewayTransactionId }),
    });
    if (settled !== true) return redirectTo(context.request.url, storeSlug, order.id, 'failed');

    // Tell the store owner (their own Telegram bots only). Never block the customer on this.
    const notify = sendPaidNotification(cfg, order, gateway, verified.amount, verified.gatewayTransactionId).catch(() => {});
    if (context.waitUntil) context.waitUntil(notify); else await notify;

    return redirectTo(context.request.url, storeSlug, order.id, 'success');
  } catch {
    return redirectTo(context.request.url, storeSlug, order.id, 'failed');
  }
}

export async function onRequest(context) {
  try {
    return await handle(context);
  } catch {
    return redirectTo(context.request.url, '', '', 'failed');
  }
}
