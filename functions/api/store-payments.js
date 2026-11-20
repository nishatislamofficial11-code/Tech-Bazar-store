import { money, initiatePayment, newAttemptId, isUuid, missingCredentials } from './_payment-lib.js';
import { serverConfig, rest, resolveStore } from './_store-lib.js';

const PAYMENT_METHODS = ['cod', 'delivery_advance', 'fixed_advance', 'full'];
const GATEWAYS = ['sslcommerz', 'eps', 'aamarpay'];
const KEYS = {
  methods: 'payment_methods',
  fixedAdvance: 'payment_fixed_advance',
  gateway: 'payment_gateway',
  environment: 'payment_environment',
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

const fail = (message, status) => Object.assign(new Error(message), { status });

// Only the store's own owner/manager (or a super admin) may change its payment settings.
async function requireStoreAdmin(request, cfg, store) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) throw fail('লগইন প্রয়োজন', 401);
  const userRes = await fetch(`${cfg.url}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: cfg.anonKey },
  });
  if (!userRes.ok) throw fail('লগইন প্রয়োজন', 401);
  const user = await userRes.json();
  if (!isUuid(user?.id)) throw fail('লগইন প্রয়োজন', 401);
  const superRows = await rest(cfg, `super_admins?user_id=eq.${user.id}&select=user_id&limit=1`);
  if (superRows?.length) return user.id;
  if (!store.is_active) throw fail('দোকানটি বর্তমানে বন্ধ', 403);
  // Same table the database's is_store_admin() uses
  const roles = await rest(cfg, `user_roles?user_id=eq.${user.id}&store_id=eq.${store.id}&role=in.(admin,manager)&select=role&limit=1`);
  if (!roles?.length) throw fail('এই দোকানের পেমেন্ট সেটিংস বদলানোর অনুমতি নেই', 403);
  return user.id;
}

async function readSettings(cfg, storeId) {
  const rows = await rest(cfg, `settings?store_id=eq.${storeId}&key=in.(${Object.values(KEYS).join(',')})&select=key,value`);
  const map = {};
  for (const row of rows || []) map[row.key] = row.value;

  let methods = ['cod'];
  try {
    const parsed = JSON.parse(map[KEYS.methods] || '[]');
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((m) => PAYMENT_METHODS.includes(m));
      if (valid.length) methods = valid;
    }
  } catch { /* keep default */ }

  const gateway = GATEWAYS.includes(map[KEYS.gateway]) ? map[KEYS.gateway] : 'sslcommerz';
  const fixedAdvance = Math.max(0, Number(map[KEYS.fixedAdvance] || 0) || 0);
  const environment = map[KEYS.environment] === 'live' ? 'live' : 'sandbox';
  const gw = await rest(cfg, `store_payment_gateways?store_id=eq.${storeId}&gateway=eq.${gateway}&is_active=eq.true&select=credentials&limit=1`);
  const configured = Boolean(gw?.length) && missingCredentials(gateway, gw[0].credentials).length === 0;
  return { methods, fixedAdvance, gateway, environment, configured };
}

async function loadGatewayConfig(cfg, storeId) {
  const settings = await readSettings(cfg, storeId);
  if (!settings.configured) throw new Error('এই দোকানের পেমেন্ট গেটওয়ে এখনো সেটআপ হয়নি');
  const rows = await rest(cfg, `store_payment_gateways?store_id=eq.${storeId}&gateway=eq.${settings.gateway}&is_active=eq.true&select=credentials&limit=1`);
  return { gateway: settings.gateway, environment: settings.environment, credentials: rows?.[0]?.credentials || {} };
}

// Admin form field names -> stored credential names
function normalizeCredentials(raw) {
  const pick = (...names) => {
    for (const n of names) {
      const v = String(raw?.[n] ?? '').trim();
      if (v) return v;
    }
    return '';
  };
  const out = {
    store_id: pick('store_id'),
    password: pick('store_passwd', 'signature_key', 'password'),
    username: pick('username'),
    hash_key: pick('hash_key'),
    merchant_id: pick('merchant_id'),
  };
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'অনুরোধ সঠিক নয়' }, 400);
  }

  try {
    const cfg = serverConfig(context.env);
    const authHeader = context.request.headers.get('Authorization') || '';
    const store = await resolveStore(cfg, body.store, authHeader);
    if (!store) return json({ error: 'দোকান পাওয়া যায়নি' }, 404);

    switch (body.action) {
      case 'settings': {
        return json(await readSettings(cfg, store.id));
      }

      case 'save-settings': {
        await requireStoreAdmin(context.request, cfg, store);
        const d = body.data || {};
        const methods = Array.isArray(d.methods) ? [...new Set(d.methods.filter((m) => PAYMENT_METHODS.includes(m)))] : [];
        if (!methods.length) throw new Error('অন্তত একটি পেমেন্ট পদ্ধতি বাছুন');
        const fixedAdvance = money(Number(d.fixedAdvance || 0));
        const gateway = GATEWAYS.includes(d.gateway) ? d.gateway : 'sslcommerz';
        const environment = d.environment === 'live' ? 'live' : 'sandbox';

        // Gateway credentials: keep what is already saved and replace only the fields typed in now.
        const typed = normalizeCredentials(d.credentials || {});
        const existingRows = await rest(cfg, `store_payment_gateways?store_id=eq.${store.id}&gateway=eq.${gateway}&select=credentials&limit=1`);
        const existing = existingRows?.[0]?.credentials || {};
        const hasTyped = Object.keys(typed).length > 0;
        const credentials = { ...existing, ...typed };
        const missing = missingCredentials(gateway, credentials);
        if (hasTyped && missing.length) throw new Error(`গেটওয়ের এই তথ্যগুলো দিন: ${missing.join(', ')}`);
        if (methods.some((m) => m !== 'cod') && missing.length) {
          throw new Error(`অনলাইন পেমেন্ট চালু করতে আগে গেটওয়ের এই তথ্যগুলো দিন: ${missing.join(', ')}`);
        }
        if (hasTyped) {
          await rest(cfg, 'store_payment_gateways?on_conflict=store_id,gateway', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify([{ store_id: store.id, gateway, credentials, is_active: true, sandbox: environment !== 'live' }]),
          });
        }

        const settingRows = [
          { key: KEYS.methods, value: JSON.stringify(methods), store_id: store.id },
          { key: KEYS.fixedAdvance, value: String(fixedAdvance), store_id: store.id },
          { key: KEYS.gateway, value: gateway, store_id: store.id },
          { key: KEYS.environment, value: environment, store_id: store.id },
        ];
        await rest(cfg, 'settings?on_conflict=store_id,key', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(settingRows),
        });
        return json(await readSettings(cfg, store.id));
      }

      // Starts (or retries) online payment for an order. Needs the order's secret checkout token.
      case 'initiate': {
        if (!store.is_active) throw new Error('দোকানটি বর্তমানে বন্ধ');
        const orderId = String(body.data?.orderId || '');
        const token = String(body.data?.token || '');
        if (!isUuid(orderId) || !isUuid(token)) throw new Error('অর্ডার পাওয়া যায়নি');
        const orders = await rest(cfg, `orders?id=eq.${orderId}&store_id=eq.${store.id}&select=id,checkout_token,store_id,total_amount,advance_required,advance_paid,payment_status,shipping_address,customer_name,customer_phone,customer_address&limit=1`);
        const order = orders?.[0];
        if (!order || order.checkout_token !== token) throw new Error('অর্ডার পাওয়া যায়নি');
        if (order.payment_status === 'paid' || order.payment_status === 'partial') throw new Error('এই অর্ডারের পেমেন্ট আগেই সম্পন্ন হয়েছে');
        const due = money(Number(order.advance_required || 0) - Number(order.advance_paid || 0));
        if (due <= 0) throw new Error('এই অর্ডারে অনলাইন পেমেন্টের প্রয়োজন নেই');

        const config = await loadGatewayConfig(cfg, store.id);
        const attemptId = newAttemptId();
        await rest(cfg, 'payment_attempts', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify([{ id: attemptId, order_id: order.id, store_id: store.id, gateway: config.gateway, amount: due }]),
        });

        const origin = new URL(context.request.url).origin;
        const info = typeof order.shipping_address === 'string' ? order.shipping_address : '';
        const result = await initiatePayment(config, {
          orderId: order.id,
          transactionId: attemptId,
          amount: due,
          currency: 'BDT',
          customerName: order.customer_name || info.match(/Name: (.+)/)?.[1] || 'Customer',
          customerPhone: order.customer_phone || info.match(/Phone: (.+)/)?.[1] || '',
          customerAddress: order.customer_address || info.match(/Address: (.+)/)?.[1] || 'Bangladesh',
          productName: `Order ${order.id.slice(0, 8)}`,
          callbackBase: `${origin}/api/payment-callback`,
        });
        return json({ redirectUrl: result.redirectUrl });
      }

      default:
        return json({ error: 'অজানা অনুরোধ' }, 400);
    }
  } catch (err) {
    return json({ error: err.message || 'সমস্যা হয়েছে' }, err.status || 400);
  }
}
