// Shared server helpers (underscore prefix = not a route).

export function serverConfig(env) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) throw new Error('সার্ভার কনফিগারেশন অসম্পূর্ণ: SUPABASE_URL / SUPABASE_ANON_KEY নেই');
  if (!serviceKey) throw new Error('সার্ভার কনফিগারেশন অসম্পূর্ণ: Cloudflare-এ SUPABASE_SERVICE_ROLE_KEY সেট করা নেই');
  return { url, anonKey, serviceKey };
}

// Database call with the service key (bypasses RLS — only for server-side checks).
export async function rest(cfg, path, options = {}) {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.message || ''; } catch { /* ignore */ }
    throw new Error(`ডাটাবেস সমস্যা (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;

// Finds the store for a request. Every store is treated the same way:
// with a store link (?store=slug) we use that slug; without one we ask the database
// which store this request belongs to, using exactly the rule the rest of the site uses
// (current_store_id), so the server and the storefront always agree.
export async function resolveStore(cfg, slug, authHeader) {
  const clean = String(slug || '').trim().toLowerCase();
  let filter;
  if (clean) {
    if (!SLUG.test(clean)) return null;
    filter = `slug=eq.${encodeURIComponent(clean)}`;
  } else {
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${cfg.anonKey}`;
    const res = await fetch(`${cfg.url}/rest/v1/rpc/current_store_id`, {
      method: 'POST',
      headers: { apikey: cfg.anonKey, Authorization: bearer, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return null;
    const id = await res.json();
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return null;
    filter = `id=eq.${id}`;
  }
  const rows = await rest(cfg, `stores?${filter}&select=id,slug,is_active&limit=1`);
  return rows?.[0] || null;
}

// Sends a message to the Telegram bots configured for ONE store (never another store's bots).
export async function notifyStoreTelegram(cfg, storeId, messageHtml) {
  const rows = await rest(cfg, `settings?store_id=eq.${storeId}&key=in.(telegram_bot_token,telegram_chat_id,telegram_notifications_enabled,telegram_bots)&select=key,value`);
  const map = {};
  for (const row of rows || []) map[row.key] = row.value;
  if (map.telegram_notifications_enabled !== 'true') return 0;

  let bots = [];
  try {
    const parsed = JSON.parse(map.telegram_bots || '[]');
    if (Array.isArray(parsed)) {
      bots = parsed
        .map((b) => ({ token: String(b?.bot_token || b?.botToken || '').trim(), chat: String(b?.chat_id || b?.chatId || '').trim() }))
        .filter((b) => b.token && b.chat);
    }
  } catch { /* ignore bad JSON */ }
  if (!bots.length && map.telegram_bot_token && map.telegram_chat_id) {
    bots.push({ token: map.telegram_bot_token.trim(), chat: map.telegram_chat_id.trim() });
  }

  const results = await Promise.allSettled(bots.map((b) => fetch(`https://api.telegram.org/bot${b.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: b.chat, text: messageHtml, parse_mode: 'HTML', disable_web_page_preview: true }),
  })));
  return results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
}

export function escapeHtml(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
