import { money, validateSettlement, verifyPayment } from './_payment-lib.js';

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

function redirectTo(requestUrl, storeSlug, orderId, outcome) {
  const qs = new URLSearchParams({ store: storeSlug, order: orderId, payment: outcome });
  return Response.redirect(new URL(`/?${qs.toString()}`, requestUrl).toString(), 303);
}

async function handle(context) {
  const params = await readParams(context.request);
  const gateway = params['gateway'];
  const status = params['status'] || '';
  const orderId = params['tran_id'] || params['mer_txnid'] || params['MerchantTransactionId'] || params['merchantTransactionId'] || params['order'] || '';

  if (!['sslcommerz', 'eps', 'aamarpay'].includes(gateway) || !orderId) {
    return new Response(JSON.stringify({ error: 'অনুরোধ সঠিক নয়' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const url = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
  const serviceKey = context.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: 'সার্ভার কনফিগারেশন অসম্পূর্ণ' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const rest = async (path, options = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`ডাটাবেস সমস্যা (${res.status})`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  const orders = await rest(`orders?id=eq.${orderId}&select=id,store_id,total_amount,advance_required,advance_paid,payment_status,stores(slug)&limit=1`);
  const order = orders?.[0];
  if (!order || !order.store_id) {
    return new Response(JSON.stringify({ error: 'অর্ডার পাওয়া যায়নি' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
  const storeSlug = order.stores?.slug || '';

  if (status === 'cancelled') return redirectTo(context.request.url, storeSlug, orderId, 'cancelled');
  if (status === 'failed') return redirectTo(context.request.url, storeSlug, orderId, 'failed');

  // Idempotency: settle only once
  if (order.payment_status === 'paid' || order.payment_status === 'partial') {
    return redirectTo(context.request.url, storeSlug, orderId, 'success');
  }

  const gwRows = await rest(`store_payment_gateways?store_id=eq.${order.store_id}&gateway=eq.${gateway}&is_active=eq.true&select=credentials&limit=1`);
  const credentials = gwRows?.[0]?.credentials;
  if (!credentials) return redirectTo(context.request.url, storeSlug, orderId, 'failed');

  const envRows = await rest(`settings?store_id=eq.${order.store_id}&key=eq.payment_environment&select=value&limit=1`);
  const config = {
    gateway,
    environment: envRows?.[0]?.value === 'live' ? 'live' : 'sandbox',
    credentials,
  };

  try {
    const verified = await verifyPayment(config, params);
    const expected = money(Number(order.advance_required || 0) - Number(order.advance_paid || 0));
    const ok = validateSettlement(
      { transaction: order.id, amount: expected, currency: 'BDT', store: order.store_id },
      { transaction: verified.transaction, amount: verified.amount, currency: verified.currency, store: order.store_id, successful: verified.successful },
    );
    if (!ok) return redirectTo(context.request.url, storeSlug, orderId, 'failed');

    const settled = await rest('rpc/settle_verified_payment', {
      method: 'POST', body: JSON.stringify({ target_order: order.id, verified_amount: verified.amount,
        gateway_name: gateway, gateway_transaction: verified.gatewayTransactionId }),
    });
    if (settled !== true) return redirectTo(context.request.url, storeSlug, orderId, 'failed');
    return redirectTo(context.request.url, storeSlug, orderId, 'success');
  } catch {
    return redirectTo(context.request.url, storeSlug, orderId, 'failed');
  }
}

export async function onRequest(context) {
  return handle(context);
}
