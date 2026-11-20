/**
 * Super admin only: asks the chosen AI company which models this API key can use.
 *   POST /api/ai-models { provider: 'anthropic' | 'openai' | 'google' | 'groq' | 'openrouter', key?: string }
 * Uses the saved key when `key` is empty. Returns { ok, models: [{ id, name }] }.
 */
import { serverConfig, rest } from './_store-lib.js';

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const KEY_NAMES = {
  anthropic: 'private_anthropic_api_key', openai: 'private_openai_api_key', google: 'private_google_api_key',
  groq: 'private_groq_api_key', openrouter: 'private_openrouter_api_key',
};

async function isSuperAdmin(cfg, authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const res = await fetch(`${cfg.url}/rest/v1/rpc/is_super_admin`, {
    method: 'POST', headers: { apikey: cfg.anonKey, Authorization: authHeader, 'Content-Type': 'application/json' }, body: '{}',
  });
  return res.ok && (await res.json()) === true;
}

async function listModels(provider, key) {
  let res;
  if (provider === 'anthropic') {
    res = await fetch('https://api.anthropic.com/v1/models?limit=100', { headers: { 'x-api-key': key, 'anthropic-version': '2026-10-21' } });
  } else if (provider === 'groq') {
    res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  } else if (provider === 'openrouter') {
    res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  } else if (provider === 'openai') {
    res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  } else {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error('API Key ভুল বা অনুমতি নেই');
    throw new Error(data?.error?.message || `HTTP ${res.status}`);
  }
  if (provider === 'anthropic') return (data?.data || []).map((m) => ({ id: m.id, name: m.display_name || m.id }));
  if (provider === 'groq') {
    return (data?.data || [])
      .filter((m) => m.active !== false && !/(whisper|tts|guard|playai|orpheus)/i.test(m.id))
      .map((m) => ({ id: m.id, name: m.id }));
  }
  if (provider === 'openrouter') {
    // Only the free models (their ids end in ':free')
    return (data?.data || []).filter((m) => /:free$/.test(m.id)).map((m) => ({ id: m.id, name: m.name || m.id }));
  }
  if (provider === 'openai') {
    return (data?.data || [])
      .map((m) => m.id)
      .filter((id) => /^(gpt|o\d|chatgpt)/i.test(id) && !/(audio|realtime|tts|transcribe|image|search|embedding|instruct)/i.test(id))
      .sort()
      .map((id) => ({ id, name: id }));
  }
  return (data?.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name || ''))
    .map((m) => ({ id: String(m.name).replace(/^models\//, ''), name: m.displayName || m.name }));
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  try {
    const cfg = serverConfig(context.env);
    if (!(await isSuperAdmin(cfg, request.headers.get('Authorization') || ''))) return json({ ok: false, error: 'শুধু সুপার এডমিন' }, 403);
    const body = await request.json().catch(() => ({}));
    const provider = KEY_NAMES[body.provider] ? body.provider : null;
    if (!provider) return json({ ok: false, error: 'AI কোম্পানি বেছে নিন' }, 400);
    let key = String(body.key || '').trim();
    if (!key) {
      const rows = await rest(cfg, `platform_settings?key=eq.${KEY_NAMES[provider]}&select=value&limit=1`);
      key = String(rows?.[0]?.value || '').trim();
    }
    if (!key) return json({ ok: false, error: 'আগে API Key দিন' }, 400);
    const models = await listModels(provider, key);
    return json({ ok: true, models });
  } catch (err) {
    return json({ ok: false, error: err?.message || 'মডেল তালিকা আনা যায়নি' }, 500);
  }
}
