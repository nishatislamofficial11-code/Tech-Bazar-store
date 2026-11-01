import { money, initiatePayment } from './_payment-lib.js';

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

function getConfig(context) {
  const url = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
  const serviceKey = context.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) throw new Error('সার্ভার কনফিগারেশন অসম্পূর্ণ');
  return { url, serviceKey, anonKey };
}

async function rest(cfg, path, options = {}) {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`ডাটাবেস সমস্যা (${res.status})`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function resolveStore(cfg, slug) {
  const rows = await rest(cfg, `stores?slug=eq.${encodeURIComponent(String(slug || '').toLowerCase())}&select=id,slug,is_active&limit=1`);
  return rows?.[0] || null;
}

async function requireStoreAdmin(request, cfg, storeId) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) throw Object.assign(new Error('লগইন প্রয়োজন'), { status: 401 });
  const userRes = await fetch(`${cfg.url}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: cfg.anonKey },
  });
  if (!userRes.ok) throw Object.assign(new Error('লগইন প্রয়োজন'), { status: 401 });
  const user = await userRes.json();
  const superRows = await rest(cfg, `super_admins?user_id=eq.${user.id}&select=user_id&limit=1`);
  if (superRows?.length) return user.id;
  const profiles = await rest(cfg, `profiles?id=eq.${user.id}&select=id,role,store_id&limit=1`);
  const profile = profiles?.[0];
  if (!profile || profile.store_id !== storeId || !['admin', 'manager'].includes(profile.role)) {
    throw Object.assign(new Error('এই দোকানের পেমেন্ট সেটিংস বদলানোর অনুমতি নেই'), { status: 403 });
  }
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
  const gw = await rest(cfg, `store_payment_gateways?store_id=eq.${storeId}&gateway=eq.${gateway}&is_active=eq.true&select=id&limit=1`);
  return { methods, fixedAdvance, gateway, environment, configured: Boolean(gw?.length) };
}

async function loadGatewayConfig(cfg, storeId) {
  const settings = await readSettings(cfg, storeId);
  if (!settings.configured) throw new Error('এই দোকানের পেমেন্ট গেটওয়ে এখনো সেটআপ হয়নি');
  const rows = await rest(cfg, `store_payment_gateways?store_id=eq.${storeId}&gateway=eq.${settings.gateway}&is_active=eq.true&select=credentials&limit=1`);
  const c = rows?.[0]?.credentials || {};
  if (!c.store_id || !c.password) throw new Error('গেটওয়ের তথ্য অসম্পূর্ণ');
  return { gateway: settings.gateway, environment: settings.environment, credentials: c };
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
  if (context.request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'অনুরোধ সঠিক নয়' }, 400);
  }

  try {
    const cfg = getConfig(context);
    const store = await resolveStore(cfg, body.store);
    if (!store) return json({ error: 'দোকান পাওয়া যায়নি' }, 404);

    switch (body.action) {
      case 'settings': {
        return json(await readSettings(cfg, store.id));
      }

      case 'save-settings': {
        await requireStoreAdmin(context.request, cfg, store.id);
        const d = body.data || {};
        const methods = Array.isArray(d.methods) ? d.methods.filter((m) => PAYMENT_METHODS.includes(m)) : [];
        if (!methods.length) throw new Error('অন্তত একটি পেমেন্ট পদ্ধতি বাছুন');
        const fixedAdvance = money(Number(d.fixedAdvance || 0));
        const gateway = GATEWAYS.includes(d.gateway) ? d.gateway : 'sslcommerz';
        const environment = d.environment === 'live' ? 'live' : 'sandbox';

        const rows = [
          { key: KEYS.methods, value: JSON.stringify(methods), store_id: store.id },
          { key: KEYS.fixedAdvance, value: String(fixedAdvance), store_id: store.id },
          { key: KEYS.gateway, value: gateway, store_id: store.id },
          { key: KEYS.environment, value: environment, store_id: store.id },
        ];
        await rest(cfg, 'settings?on_conflict=store_id,key', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows),
        });

        // Optional gateway credentials in the same save
        const rawCreds = d.credentials || {};
        const hasCreds = Object.values(rawCreds).some((v) => String(v || '').trim());
        if (hasCreds) {
          const credentials = {
            store_id: String(rawCreds.store_id || '').trim(),
            password: String(rawCreds.store_passwd || rawCreds.signature_key || rawCreds.password || '').trim(),
          };
          if (rawCreds.username) credentials.username = String(rawCreds.username).trim();
          if (rawCreds.hash_key) credentials.hash_key = String(rawCreds.hash_key).trim();
          if (rawCreds.merchant_id) credentials.merchant_id = String(rawCreds.merchant_id).trim();
          if (!credentials.store_id || !credentials.password) {
            throw new Error('গেটওয়ের Store ID ও Password/Signature Key দুটোই দিন');
          }
          await rest(cfg, 'store_payment_gateways?on_conflict=store_id,gateway', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify([{
              store_id: store.id,
              gateway,
              credentials,
              is_active: true,
              sandbox: environment !== 'live',
            }]),
          });
        }
        return json(await readSettings(cfg, store.id));
      }

      case 'initiate': {
        if (!store.is_active) throw new Error('দোকানটি বর্তমানে বন্ধ');
        const orderId = String(body.data?.orderId || '');
        if (!orderId) throw new Error('অর্ডার পাওয়া যায়নি');
        const orders = await rest(cfg, `orders?id=eq.${orderId}&store_id=eq.${store.id}&select=id,store_id,total_amount,advance_required,advance_paid,payment_status,shipping_address&limit=1`);
        const order = orders?.[0];
        if (!order) throw new Error('অর্ডার পাওয়া যায়নি');
        if (order.payment_status === 'paid') throw new Error('এই অর্ডারের পেমেন্ট আগেই সম্পন্ন হয়েছে');
        const due = money(Number(order.advance_required || 0) - Number(order.advance_paid || 0));
        if (due <= 0) throw new Error('এই অর্ডারে অনলাইন পেমেন্টের প্রয়োজন নেই');

        const config = await loadGatewayConfig(cfg, store.id);
        const origin = new URL(context.request.url).origin;
        const info = String(order.shipping_address || '');
        const name = info.match(/Name: (.+)/)?.[1] || 'Customer';
        const phone = info.match(/Phone: (.+)/)?.[1] || '';
        const address = info.match(/Address: (.+)/)?.[1] || 'Bangladesh';
        const result = await initiatePayment(config, {
          orderId: order.id,
          amount: due,
          currency: 'BDT',
          customerName: name,
          customerPhone: phone,
          customerAddress: address,
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
