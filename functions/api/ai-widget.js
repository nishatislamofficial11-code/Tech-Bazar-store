/**
 * Website AI chat for shop visitors (no login).
 *   POST /api/ai-widget { store, visitor, action: 'send', message, name? }  → AI reply
 *   POST /api/ai-widget { store, visitor, action: 'history' }              → this visitor's messages
 *   POST /api/ai-widget { store, visitor, action: 'human' }                → ask for a person
 * `visitor` is a random id the browser keeps; it is the only key to the visitor's chat.
 * Limits stop strangers from running up the shop's AI bill.
 */
import { serverConfig, rest, resolveStore, notifyStoreTelegram, escapeHtml } from './_store-lib.js';
import { handleCustomerMessage } from './_ai-engine.js';

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const VISITOR = /^[A-Za-z0-9-]{20,64}$/;
const MAX_NEW_CHATS_PER_IP_HOUR = 5;
const MAX_MESSAGES_PER_10_MIN = 15;

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  try {
    const cfg = serverConfig(context.env);
    const body = await request.json().catch(() => ({}));
    const visitor = String(body.visitor || '');
    if (!VISITOR.test(visitor)) return json({ ok: false, error: 'invalid visitor' }, 400);
    const store = await resolveStore(cfg, body.store, '');
    if (!store?.is_active) return json({ ok: false, error: 'দোকান পাওয়া যায়নি' }, 404);

    const flag = await rest(cfg, `settings?store_id=eq.${store.id}&key=eq.ai_web_chat_enabled&select=value&limit=1`);
    if (flag?.[0]?.value !== 'true') return json({ ok: false, error: 'চ্যাট এখন বন্ধ আছে' }, 403);

    const externalId = `web-${visitor}`;
    const found = await rest(cfg, `ai_conversations?store_id=eq.${store.id}&channel=eq.website&external_id=eq.${externalId}&select=*&limit=1`);
    let conv = found?.[0] || null;

    if (body.action === 'history') {
      if (!conv) return json({ ok: true, messages: [], status: 'ai' });
      const msgs = await rest(cfg, `ai_messages?conversation_id=eq.${conv.id}&role=neq.system&select=id,role,content,agent_name,attachments,created_at&order=created_at.asc&limit=100`);
      return json({ ok: true, messages: msgs || [], status: conv.status });
    }

    if (body.action === 'human') {
      if (!conv) return json({ ok: false, error: 'আগে একটা মেসেজ লিখুন' }, 400);
      if (conv.status === 'ai' || conv.status === 'resolved') {
        await rest(cfg, `ai_conversations?id=eq.${conv.id}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'needs_human', handoff_reason: 'কাস্টমার মানুষের সাথে কথা বলতে চেয়েছেন', unread: (conv.unread || 0) + 1 }),
        });
        await notifyStoreTelegram(cfg, store.id, `🔴 <b>Human Need</b>\n${escapeHtml(conv.customer_name || 'ওয়েবসাইট ভিজিটর')} (website)\nকাস্টমার মানুষের সাথে কথা বলতে চান।`).catch(() => 0);
      }
      return json({ ok: true, status: 'needs_human' });
    }

    if (body.action !== 'send') return json({ ok: false, error: 'Unknown action' }, 400);
    const message = String(body.message || '').trim();
    const photos = (Array.isArray(body.photos) ? body.photos : []).map(String)
      .filter((u) => /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(u) && u.length < 500).slice(0, 3);
    if (!message && !photos.length) return json({ ok: false, error: 'মেসেজ লিখুন' }, 400);
    if (message.length > 1000) return json({ ok: false, error: 'মেসেজ অনেক বড়, একটু ছোট করে লিখুন' }, 400);
    const ip = String(request.headers.get('CF-Connecting-IP') || '').slice(0, 45);

    if (!conv) {
      if (ip) {
        const since = new Date(Date.now() - 3600_000).toISOString();
        const recent = await rest(cfg, `ai_conversations?store_id=eq.${store.id}&visitor_ip=eq.${encodeURIComponent(ip)}&created_at=gt.${since}&select=id&limit=${MAX_NEW_CHATS_PER_IP_HOUR}`);
        if ((recent || []).length >= MAX_NEW_CHATS_PER_IP_HOUR) return json({ ok: false, error: 'অনেক বেশি চেষ্টা হয়েছে, একটু পরে আবার লিখুন' }, 429);
      }
      const name = String(body.name || '').trim().slice(0, 60) || 'ওয়েবসাইট ভিজিটর';
      const created = await rest(cfg, 'ai_conversations', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ store_id: store.id, channel: 'website', external_id: externalId, customer_name: name, visitor_ip: ip || null }),
      });
      conv = created[0];
    } else {
      const since = new Date(Date.now() - 600_000).toISOString();
      const recent = await rest(cfg, `ai_messages?conversation_id=eq.${conv.id}&role=eq.customer&created_at=gt.${since}&select=id&limit=${MAX_MESSAGES_PER_10_MIN}`);
      if ((recent || []).length >= MAX_MESSAGES_PER_10_MIN) return json({ ok: false, error: 'একটু থামুন, কিছুক্ষণ পর আবার লিখুন' }, 429);
    }

    // Keep working even if the visitor closes the chat, so the reply is saved for when they come back
    const work = handleCustomerMessage(cfg, store, conv, message, photos);
    context.waitUntil?.(work.catch(() => null));
    const result = await work;
    return json({ ok: true, reply: result.reply, status: result.status, attachments: result.attachments || [] });
  } catch (err) {
    return json({ ok: false, error: 'এখন উত্তর দেওয়া যাচ্ছে না, একটু পরে চেষ্টা করুন' }, 500);
  }
}
