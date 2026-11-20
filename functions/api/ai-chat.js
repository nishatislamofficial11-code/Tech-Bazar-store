/**
 * AI Automation admin API.
 *   POST /api/ai-chat  { store, action: 'test', message }            → shop staff tries the AI as a customer
 *   POST /api/ai-chat  { store, action: 'reset_test' }               → clears the staff member's test chat
 *   POST /api/ai-chat  { store, action: 'agent_send', conversation_id, message } → staff replies to a customer
 * Requires the logged-in shop owner/manager (Authorization: Bearer <session token>).
 */
import { serverConfig, rest, resolveStore } from './_store-lib.js';
import { handleCustomerMessage, addAgentMessage } from './_ai-engine.js';

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

async function staffMember(cfg, slug, authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const userRes = await fetch(`${cfg.url}/auth/v1/user`, { headers: { apikey: cfg.anonKey, Authorization: authHeader } });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  const adminRes = await fetch(`${cfg.url}/rest/v1/rpc/is_store_admin`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, Authorization: authHeader, 'Content-Type': 'application/json', ...(slug ? { 'x-store': slug } : {}) },
    body: '{}',
  });
  if (!adminRes.ok || (await adminRes.json()) !== true) return null;
  const prof = await rest(cfg, `profiles?id=eq.${user.id}&select=full_name&limit=1`).catch(() => null);
  return { id: user.id, name: prof?.[0]?.full_name || user.email || 'Agent' };
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
    const agent = await staffMember(cfg, store.slug, authHeader);
    if (!agent) return json({ ok: false, error: 'শুধু দোকানের মালিক বা ম্যানেজার এটা করতে পারবেন' }, 403);

    if (body.action === 'test' || body.action === 'reset_test') {
      const externalId = `test-${agent.id}`;
      if (body.action === 'reset_test') {
        await rest(cfg, `ai_conversations?store_id=eq.${store.id}&channel=eq.test&external_id=eq.${externalId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        return json({ ok: true });
      }
      const message = String(body.message || '').trim();
      if (!message) return json({ ok: false, error: 'মেসেজ লিখুন' }, 400);
      if (message.length > 1000) return json({ ok: false, error: 'মেসেজ অনেক বড়' }, 400);
      let rows = await rest(cfg, `ai_conversations?store_id=eq.${store.id}&channel=eq.test&external_id=eq.${externalId}&select=*&limit=1`);
      if (!rows?.length) {
        rows = await rest(cfg, 'ai_conversations', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ store_id: store.id, channel: 'test', external_id: externalId, customer_name: `টেস্ট (${agent.name})` }),
        });
      }
      const conv = rows[0];
      const result = await handleCustomerMessage(cfg, store, conv, message);
      return json({ ok: true, conversation_id: conv.id, ...result });
    }

    if (body.action === 'agent_send') {
      const id = String(body.conversation_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: 'চ্যাট পাওয়া যায়নি' }, 400);
      const rows = await rest(cfg, `ai_conversations?id=eq.${id}&store_id=eq.${store.id}&select=*&limit=1`);
      const conv = rows?.[0];
      if (!conv) return json({ ok: false, error: 'চ্যাট পাওয়া যায়নি' }, 404);
      const message = String(body.message || '').trim();
      if (!message) return json({ ok: false, error: 'মেসেজ লিখুন' }, 400);
      if (conv.channel !== 'test') {
        return json({ ok: false, error: 'Facebook/Instagram/WhatsApp সংযোগ এখনো চালু হয়নি, তাই এই চ্যাটে মেসেজ পাঠানো যাচ্ছে না' }, 400);
      }
      await addAgentMessage(cfg, conv, agent, message);
      return json({ ok: true });
    }

    return json({ ok: false, error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ ok: false, error: err?.message || 'সমস্যা হয়েছে' }, 500);
  }
}
