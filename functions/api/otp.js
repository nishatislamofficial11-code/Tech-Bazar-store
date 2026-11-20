// Phone verification for merchant sign-up: POST { action: 'send' | 'verify', phone, code? }
import { serverConfig, rest } from './_store-lib.js';
import { sendSms, smsConfigured } from './_sms.js';

const PHONE_RE = /^01[3-9]\d{8}$/;
const CODE_TTL_MIN = 5;
const MAX_TRIES = 5;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sixDigits() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 1000000).padStart(6, '0');
}

const since = (minutes) => encodeURIComponent(new Date(Date.now() - minutes * 60000).toISOString());

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'অনুরোধ সঠিক নয়' }, 400); }

  try {
    const cfg = serverConfig(context.env);
    const phone = String(body.phone || '').replace(/\D/g, '').slice(-11);
    if (!PHONE_RE.test(phone)) return json({ error: 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)' }, 400);
    const ip = context.request.headers.get('CF-Connecting-IP') || '';
    const pepper = cfg.serviceKey; // server-only secret, never sent to the browser

    if (body.action === 'send') {
      if (!smsConfigured(context.env)) return json({ error: 'SMS সার্ভিস এখনো সেটআপ হয়নি। একটু পরে চেষ্টা করুন।' }, 503);

      const owned = await rest(cfg, `stores?owner_phone=eq.${phone}&select=id&limit=1`);
      if (owned?.length) return json({ error: 'এই নম্বর দিয়ে আগেই একটা দোকান খোলা হয়েছে। লগইন করুন।' }, 409);

      // Limits: 1 code per minute per number, 5 per hour per number, 10 per hour per device/network
      const last = await rest(cfg, `phone_otps?phone=eq.${phone}&created_at=gte.${since(1)}&select=id&limit=1`);
      if (last?.length) return json({ error: '১ মিনিট পরে আবার কোড চাইতে পারবেন।' }, 429);
      const hourPhone = await rest(cfg, `phone_otps?phone=eq.${phone}&created_at=gte.${since(60)}&select=id`);
      if ((hourPhone?.length || 0) >= 5) return json({ error: 'অনেকবার কোড চাওয়া হয়েছে। ১ ঘণ্টা পরে চেষ্টা করুন।' }, 429);
      if (ip) {
        const hourIp = await rest(cfg, `phone_otps?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since(60)}&select=id`);
        if ((hourIp?.length || 0) >= 10) return json({ error: 'অনেকবার কোড চাওয়া হয়েছে। পরে চেষ্টা করুন।' }, 429);
      }

      const code = sixDigits();
      await rest(cfg, 'phone_otps', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{
          phone, ip: ip || null, code_hash: await sha256(`${phone}:${code}:${pepper}`),
          expires_at: new Date(Date.now() + CODE_TTL_MIN * 60000).toISOString(),
        }]),
      });
      await sendSms(context.env, phone, `Your Cloud Commerce code is ${code}. Valid for ${CODE_TTL_MIN} minutes. Do not share it with anyone.`);
      return json({ ok: true, ttl: CODE_TTL_MIN * 60 });
    }

    if (body.action === 'verify') {
      const code = String(body.code || '').replace(/\D/g, '');
      if (code.length !== 6) return json({ error: '৬ সংখ্যার কোড দিন' }, 400);
      const rows = await rest(cfg, `phone_otps?phone=eq.${phone}&verified_at=is.null&order=created_at.desc&limit=1&select=id,code_hash,expires_at,attempts`);
      const row = rows?.[0];
      if (!row || new Date(row.expires_at) < new Date()) return json({ error: 'কোডের মেয়াদ শেষ। নতুন কোড নিন।' }, 400);
      if (row.attempts >= MAX_TRIES) return json({ error: 'অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।' }, 429);
      if ((await sha256(`${phone}:${code}:${pepper}`)) !== row.code_hash) {
        await rest(cfg, `phone_otps?id=eq.${row.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ attempts: row.attempts + 1 }) });
        return json({ error: 'কোড মেলেনি, আবার দেখে দিন।' }, 400);
      }
      await rest(cfg, `phone_otps?id=eq.${row.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ verified_at: new Date().toISOString() }) });
      return json({ ok: true });
    }

    return json({ error: 'অজানা অনুরোধ' }, 400);
  } catch (err) {
    return json({ error: err.message || 'সমস্যা হয়েছে' }, err.status || 500);
  }
}
