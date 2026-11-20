import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Settings2, CalendarPlus, BadgeCheck, Ban, Check, X, Infinity as InfinityIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface PlanInfo {
  status?: string;
  trial_ends_at?: string | null;
  paid_until?: string | null;
  open?: boolean;
  owner_name?: string | null;
  owner_phone?: string | null;
  business_type?: string | null;
  signup_source?: string | null;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const left = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null);

// One-line plan status shown on each store row
export function PlanBadge({ s }: { s: PlanInfo }) {
  if (!s.status) return null;
  const end = s.status === 'trial' ? s.trial_ends_at : s.paid_until;
  const d = left(end);
  const label: Record<string, string> = {
    pending: 'অনুমোদনের অপেক্ষায়', trial: 'ট্রায়াল', active: 'পেইড', expired: 'মেয়াদ শেষ', suspended: 'বন্ধ', rejected: 'বাতিল',
  };
  const tone = s.status === 'pending' ? 'bg-amber-500/15 text-amber-300'
    : s.open ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300';
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label[s.status] || s.status}
      {end ? <> · {fmt(end)}{d !== null && (d >= 0 ? ` (${d} দিন বাকি)` : ' (শেষ)')}</> : s.status === 'active' ? ' · মেয়াদ ছাড়া' : ''}
      {s.signup_source === 'self' && ' · নিজে সাইন আপ'}
    </span>
  );
}

// Buttons inside a store's "details" panel
export function PlanActions({ storeId, s, onDone }: { storeId: string; s: PlanInfo; onDone: () => void }) {
  const [busy, setBusy] = useState('');
  const run = async (action: string, days = 30, ok = 'হয়ে গেছে') => {
    setBusy(action);
    const { error } = await supabase.rpc('super_set_store_plan', { p_store_id: storeId, p_action: action, p_days: days });
    setBusy('');
    if (error) toast.error(error.message); else { toast.success(ok); onDone(); }
  };
  const btn = 'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50';
  return (
    <div className="space-y-2 rounded-lg bg-slate-900 p-3">
      <p className="text-xs font-bold text-slate-300">প্ল্যান ও মেয়াদ</p>
      {(s.owner_name || s.owner_phone) && (
        <p className="text-xs text-slate-400">মালিক: {s.owner_name || '—'} · {s.owner_phone || '—'}{s.business_type ? ` · ${s.business_type}` : ''}</p>
      )}
      {s.status === 'pending' ? (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={!!busy} onClick={() => run('approve', 30, 'অনুমোদন দেওয়া হয়েছে, ট্রায়াল শুরু')} className={`${btn} bg-emerald-500 text-slate-950`}><Check className="h-4 w-4" />অনুমোদন দিন</button>
          <button disabled={!!busy} onClick={() => run('reject', 30, 'আবেদন বাতিল করা হয়েছে')} className={`${btn} border border-red-500/60 text-red-300`}><X className="h-4 w-4" />বাতিল</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={!!busy} onClick={() => run('mark_paid', 30, 'পেমেন্ট যোগ হয়েছে: +৩০ দিন')} className={`${btn} bg-emerald-500 text-slate-950`}><BadgeCheck className="h-4 w-4" />পেমেন্ট পেয়েছি +৩০ দিন</button>
          <button disabled={!!busy} onClick={() => run('extend_trial', 7, 'ট্রায়াল ৭ দিন বাড়ানো হয়েছে')} className={`${btn} bg-slate-700 text-white`}><CalendarPlus className="h-4 w-4" />ট্রায়াল +৭ দিন</button>
          <button disabled={!!busy} onClick={() => run('no_expiry', 30, 'মেয়াদ ছাড়া চালু করা হয়েছে')} className={`${btn} bg-slate-700 text-white`}><InfinityIcon className="h-4 w-4" />মেয়াদ ছাড়া চালু</button>
          <button disabled={!!busy} onClick={() => run('expire', 30, 'মেয়াদ শেষ করা হয়েছে, দোকান ক্রেতাদের জন্য বন্ধ')} className={`${btn} border border-red-500/60 text-red-300`}><Ban className="h-4 w-4" />মেয়াদ শেষ করুন</button>
        </div>
      )}
    </div>
  );
}

// Platform-wide settings: how sign-ups work, trial length and the plan shown to owners
export function PlatformSettingsCard() {
  const [vals, setVals] = useState({ signup_mode: 'auto', trial_days: '30', plan_name: 'Cloud Commerce', plan_price: '', phone_verification: 'on' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from('platform_settings').select('key, value').then(({ data }) => {
      if (data) setVals((v) => ({ ...v, ...Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value])) }));
    });
  }, []);
  const save = async () => {
    const days = Number(vals.trial_days);
    if (!Number.isInteger(days) || days < 1 || days > 365) { toast.error('ট্রায়ালের দিন ১ থেকে ৩৬৫ এর মধ্যে দিন'); return; }
    setSaving(true);
    const rows = Object.entries(vals).map(([key, value]) => ({ key, value: String(value).trim(), updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('প্ল্যাটফর্ম সেটিংস সেভ হয়েছে');
  };
  const input = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500';
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-base font-bold flex items-center gap-2"><Settings2 className="h-5 w-5 text-emerald-400" />সাইন আপ ও প্ল্যান</h2>
      <div>
        <p className="block text-xs text-slate-300 mb-1.5">নতুন সাইন আপ হলে</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="সাইন আপের ধরন">
          {[['auto', 'সাথে সাথে চালু'], ['approval', 'আমার অনুমোদন লাগবে']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={vals.signup_mode === k} onClick={() => setVals({ ...vals, signup_mode: k })}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold border ${vals.signup_mode === k ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'border-slate-700 text-slate-300'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="block text-xs text-slate-300 mb-1.5">সাইন আপে মোবাইল নম্বর যাচাই (SMS কোড)</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="মোবাইল যাচাই">
          {[['on', 'চালু'], ['off', 'বন্ধ']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={vals.phone_verification === k} onClick={() => setVals({ ...vals, phone_verification: k })}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold border ${vals.phone_verification === k ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'border-slate-700 text-slate-300'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="ps-days" className="block text-xs text-slate-300 mb-1">ফ্রি ট্রায়াল (দিন)</label>
          <input id="ps-days" inputMode="numeric" className={input} value={vals.trial_days} onChange={(e) => setVals({ ...vals, trial_days: e.target.value.replace(/\D/g, '') })} /></div>
        <div><label htmlFor="ps-price" className="block text-xs text-slate-300 mb-1">মাসিক দাম (৳)</label>
          <input id="ps-price" inputMode="numeric" className={input} value={vals.plan_price} placeholder="যেমন 999" onChange={(e) => setVals({ ...vals, plan_price: e.target.value.replace(/\D/g, '') })} /></div>
      </div>
      <div><label htmlFor="ps-name" className="block text-xs text-slate-300 mb-1">প্ল্যানের নাম</label>
        <input id="ps-name" className={input} value={vals.plan_name} onChange={(e) => setVals({ ...vals, plan_name: e.target.value })} /></div>
      <button onClick={save} disabled={saving} className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-sm">{saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
    </section>
  );
}

// Landing page content: everything visitors see on the Cloud Commerce site
const LANDING_FIELDS: { key: string; label: string; hint?: string; long?: boolean; group: string }[] = [
  { group: 'প্রথম অংশ (হিরো)', key: 'landing_badge', label: 'ছোট ব্যাজ', hint: 'No. 1 Online business partner' },
  { group: 'প্রথম অংশ (হিরো)', key: 'landing_hero_title', label: 'শিরোনাম', hint: 'এক প্ল্যাটফর্মে আপনার' },
  { group: 'প্রথম অংশ (হিরো)', key: 'landing_hero_highlight', label: 'শিরোনামের রঙিন অংশ', hint: 'পুরো অনলাইন ব্যবসা' },
  { group: 'প্রথম অংশ (হিরো)', key: 'landing_hero_subtitle', label: 'নিচের বর্ণনা', long: true },
  { group: 'প্রথম অংশ (হিরো)', key: 'demo_store_slug', label: 'ডেমো দোকানের লিংক-নাম', hint: 'techbazar' },
  { group: 'যোগাযোগ', key: 'contact_phone', label: 'ফোন নম্বর', hint: '01XXXXXXXXX' },
  { group: 'যোগাযোগ', key: 'contact_whatsapp', label: 'WhatsApp নম্বর', hint: '01XXXXXXXXX' },
  { group: 'যোগাযোগ', key: 'contact_email', label: 'ইমেইল' },
  { group: 'যোগাযোগ', key: 'contact_address', label: 'অফিসের ঠিকানা', long: true },
  { group: 'যোগাযোগ', key: 'office_hours', label: 'অফিস সময়', hint: 'শনি–বৃহস্পতি, সকাল ১০টা–সন্ধ্যা ৭টা' },
  { group: 'সোশ্যাল মিডিয়া', key: 'social_facebook', label: 'Facebook পেজ লিংক', hint: 'https://facebook.com/...' },
  { group: 'সোশ্যাল মিডিয়া', key: 'social_youtube', label: 'YouTube লিংক', hint: 'https://youtube.com/...' },
  { group: 'সোশ্যাল মিডিয়া', key: 'social_instagram', label: 'Instagram লিংক', hint: 'https://instagram.com/...' },
  { group: 'সোশ্যাল মিডিয়া', key: 'social_tiktok', label: 'TikTok লিংক', hint: 'https://tiktok.com/@...' },
  { group: 'ফুটার', key: 'footer_about', label: 'আমাদের সম্পর্কে (ছোট লেখা)', long: true },
];

export function LandingSettingsCard() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from('platform_settings').select('key, value').then(({ data }) => {
      if (!data) return;
      const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
      setVals(map);
      try { const f = JSON.parse(map.landing_faq || '[]'); if (Array.isArray(f)) setFaq(f); } catch { /* keep empty */ }
    });
  }, []);
  const save = async () => {
    for (const k of ['social_facebook', 'social_youtube', 'social_instagram', 'social_tiktok']) {
      const v = (vals[k] || '').trim();
      if (v && !/^https?:\/\//i.test(v)) { toast.error('সোশ্যাল লিংক https:// দিয়ে শুরু করুন'); return; }
    }
    setSaving(true);
    const now = new Date().toISOString();
    const rows = LANDING_FIELDS.map(({ key }) => ({ key, value: (vals[key] || '').trim(), updated_at: now }));
    rows.push({ key: 'landing_faq', value: JSON.stringify(faq.filter((f) => f.q.trim() && f.a.trim())), updated_at: now });
    const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('ল্যান্ডিং পেজ আপডেট হয়েছে');
  };
  const input = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';
  const groups = [...new Set(LANDING_FIELDS.map((f) => f.group))];
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="text-base font-bold flex items-center gap-2"><Settings2 className="h-5 w-5 text-emerald-400" />ল্যান্ডিং পেজের তথ্য</h2>
        <p className="mt-1 text-xs text-slate-400">খালি রাখলে আগের লেখাটাই দেখাবে। সেভ করলেই সাইটে বদলে যাবে।</p>
      </div>
      {groups.map((g) => (
        <div key={g} className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">{g}</p>
          {LANDING_FIELDS.filter((f) => f.group === g).map((f) => (
            <div key={f.key}>
              <label htmlFor={`lp-${f.key}`} className="block text-xs text-slate-300 mb-1">{f.label}</label>
              {f.long ? (
                <textarea id={`lp-${f.key}`} rows={3} className={input} value={vals[f.key] || ''} placeholder={f.hint}
                  onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
              ) : (
                <input id={`lp-${f.key}`} className={input} value={vals[f.key] || ''} placeholder={f.hint}
                  onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      ))}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">প্রশ্নোত্তর (FAQ)</p>
        <p className="text-xs text-slate-400">কোনো প্রশ্ন না দিলে পেজের আগের প্রশ্নগুলোই দেখাবে।</p>
        {faq.map((f, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-slate-700 p-3">
            <input aria-label={`প্রশ্ন ${i + 1}`} className={input} value={f.q} placeholder="প্রশ্ন"
              onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
            <textarea aria-label={`উত্তর ${i + 1}`} rows={2} className={input} value={f.a} placeholder="উত্তর"
              onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
            <button type="button" onClick={() => setFaq(faq.filter((_, j) => j !== i))} className="text-xs font-bold text-red-300">মুছে ফেলুন</button>
          </div>
        ))}
        <button type="button" onClick={() => setFaq([...faq, { q: '', a: '' }])} className="w-full rounded-lg border border-dashed border-slate-600 py-2.5 text-sm font-bold text-slate-300">+ নতুন প্রশ্ন যোগ করুন</button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-sm">{saving ? 'সেভ হচ্ছে…' : 'ল্যান্ডিং পেজ সেভ করুন'}</button>
        <a href="/platform/" target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg border border-slate-700 py-2.5 text-center text-sm font-bold text-slate-200">পেজ দেখুন</a>
      </div>
    </section>
  );
}

// BulkSMSBD credentials for sign-up codes (stored as private settings: only super admin + server can read)
export function SmsSettingsCard() {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [senderId, setSenderId] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    supabase.from('platform_settings').select('key, value').in('key', ['private_sms_api_key', 'private_sms_sender_id']).then(({ data }) => {
      const map = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
      setHasKey(Boolean(map.private_sms_api_key));
      setSenderId(map.private_sms_sender_id || '');
    });
  }, []);
  const save = async () => {
    if (!hasKey && !apiKey.trim()) { toast.error('API Key দিন'); return; }
    if (!senderId.trim()) { toast.error('Sender ID দিন'); return; }
    setBusy('save');
    const now = new Date().toISOString();
    const rows = [{ key: 'private_sms_sender_id', value: senderId.trim(), updated_at: now }];
    if (apiKey.trim()) rows.push({ key: 'private_sms_api_key', value: apiKey.trim(), updated_at: now });
    const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' });
    setBusy('');
    if (error) { toast.error(error.message); return; }
    if (apiKey.trim()) setHasKey(true);
    setApiKey('');
    toast.success('SMS সেটিংস সেভ হয়েছে');
  };
  const test = async () => {
    setBusy('test');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ action: 'test', phone: testPhone }),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok || !out?.ok) throw new Error(out?.error || `সমস্যা হয়েছে (HTTP ${res.status})`);
      toast.success('টেস্ট SMS পাঠানো হয়েছে, ফোন দেখুন');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'টেস্ট SMS যায়নি');
    } finally { setBusy(''); }
  };
  const input = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold flex items-center gap-2"><Settings2 className="h-5 w-5 text-emerald-400" />SMS সেটিংস (BulkSMSBD)</h2>
        <p className="mt-1 text-xs text-slate-400">সাইন আপের যাচাই কোড এই একাউন্ট থেকে যাবে। API Key শুধু আপনি আর সার্ভার দেখতে পারে।</p>
      </div>
      <div>
        <label htmlFor="sms-key" className="block text-xs text-slate-300 mb-1">API Key</label>
        <input id="sms-key" type="password" autoComplete="off" className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasKey ? 'সেভ করা আছে — বদলাতে নতুনটা দিন' : 'BulkSMSBD API Key'} />
      </div>
      <div>
        <label htmlFor="sms-sender" className="block text-xs text-slate-300 mb-1">Sender ID</label>
        <input id="sms-sender" className={input} value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="BulkSMSBD Sender ID" />
      </div>
      <button onClick={save} disabled={!!busy} className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-sm">{busy === 'save' ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
      <div className="flex gap-2">
        <input aria-label="টেস্ট SMS যাবে এমন নম্বর" inputMode="tel" className={input} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        <button onClick={test} disabled={!!busy || !hasKey} className="shrink-0 rounded-lg border border-slate-700 px-4 text-sm font-bold text-slate-200 disabled:opacity-50">{busy === 'test' ? 'পাঠানো হচ্ছে…' : 'টেস্ট SMS'}</button>
      </div>
    </section>
  );
}

// Create a store from the super admin: same details as the public sign-up, without SMS/email checks
const BUSINESS_TYPES = ['পোশাক ও ফ্যাশন', 'ইলেকট্রনিক্স ও গ্যাজেট', 'কসমেটিকস ও বিউটি', 'খাবার ও গ্রোসারি', 'ঘর ও ফার্নিচার', 'বই ও স্টেশনারি', 'অন্যান্য'];
const SLUG_OK = /^[a-z0-9][a-z0-9-]{2,39}$/;
const PHONE_OK = /^01[3-9]\d{8}$/;
const toSlug = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export function SuperCreateStoreForm({ onCreated }: { onCreated: () => void }) {
  const empty = { ownerName: '', phone: '', email: '', password: '', storeName: '', slug: '', businessType: '', plan: 'trial' };
  const [f, setF] = useState(empty);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugFree, setSlugFree] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ storeName: string; slug: string; email: string; password: string } | null>(null);
  const set = (k: keyof typeof empty, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (!slugTouched) setF((p) => ({ ...p, slug: toSlug(p.storeName) })); }, [f.storeName, slugTouched]);
  useEffect(() => {
    setSlugFree(null);
    if (!SLUG_OK.test(f.slug)) return;
    const t = setTimeout(() => {
      supabase.rpc('store_slug_available', { p_slug: f.slug }).then(({ data }) => setSlugFree(data === true));
    }, 400);
    return () => clearTimeout(t);
  }, [f.slug]);

  const phone = f.phone.replace(/\D/g, '').slice(-11);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.ownerName.trim().length < 2) return toast.error('মালিকের নাম দিন');
    if (!PHONE_OK.test(phone)) return toast.error('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    if (f.password.length < 8) return toast.error('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন');
    if (f.storeName.trim().length < 2) return toast.error('দোকানের নাম দিন');
    if (!SLUG_OK.test(f.slug)) return toast.error('দোকানের লিংকে শুধু ইংরেজি ছোট অক্ষর, সংখ্যা আর - দিন');
    if (slugFree === false) return toast.error('এই লিংক আগে থেকেই নেওয়া');
    setBusy(true);
    const { error } = await supabase.rpc('super_create_store', {
      p_store_name: f.storeName.trim(), p_slug: f.slug, p_owner_name: f.ownerName.trim(), p_phone: phone,
      p_business_type: f.businessType || null, p_email: f.email.trim().toLowerCase(), p_password: f.password, p_plan: f.plan,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setDone({ storeName: f.storeName.trim(), slug: f.slug, email: f.email.trim().toLowerCase(), password: f.password });
    setF(empty); setSlugTouched(false);
    toast.success('নতুন দোকান তৈরি হয়েছে!');
    onCreated();
  };

  const credText = done ? `🛍️ আপনার দোকান প্রস্তুত!\n\nদোকানের নাম: ${done.storeName}\nদোকানের লিংক: ${window.location.origin}/?store=${done.slug}\n\nলগইন: ${window.location.origin}/merchant/login\nইমেইল: ${done.email}\nপাসওয়ার্ড: ${done.password}` : '';
  const input = 'w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';
  const label = 'block text-sm text-slate-300 mb-1.5';
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h2 className="text-base font-bold mb-1">নতুন দোকান তৈরি করুন</h2>
      <p className="text-xs text-slate-400 mb-4">সাইন আপ পেজের মতোই সব তথ্য লাগবে, শুধু মোবাইল বা ইমেইলের কোড লাগবে না।</p>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <div><label htmlFor="sc-owner" className={label}>মালিকের নাম</label>
          <input id="sc-owner" className={input} value={f.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></div>
        <div><label htmlFor="sc-phone" className={label}>মোবাইল নম্বর</label>
          <input id="sc-phone" inputMode="tel" className={input} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01XXXXXXXXX" /></div>
        <div><label htmlFor="sc-email" className={label}>ইমেইল (লগইনের জন্য)</label>
          <input id="sc-email" type="email" className={input} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="owner@example.com" /></div>
        <div><label htmlFor="sc-pass" className={label}>পাসওয়ার্ড</label>
          <input id="sc-pass" type="text" autoComplete="off" className={input} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="কমপক্ষে ৮ অক্ষর" /></div>
        <div><label htmlFor="sc-store" className={label}>দোকান বা কোম্পানির নাম</label>
          <input id="sc-store" className={input} value={f.storeName} onChange={(e) => set('storeName', e.target.value)} /></div>
        <div><label htmlFor="sc-slug" className={label}>দোকানের লিংক</label>
          <input id="sc-slug" className={input} value={f.slug} autoCapitalize="none" spellCheck={false}
            onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-')); }} placeholder="my-shop" />
          <p className={`text-xs mt-1.5 ${!f.slug ? 'text-slate-500' : !SLUG_OK.test(f.slug) || slugFree === false ? 'text-red-400' : slugFree ? 'text-emerald-400' : 'text-slate-400'}`}>
            {!f.slug ? 'ইংরেজি ছোট অক্ষর, সংখ্যা আর -' : !SLUG_OK.test(f.slug) ? 'শুধু ইংরেজি ছোট অক্ষর, সংখ্যা আর - (৩-৪০ অক্ষর)'
              : slugFree === false ? '✗ এই লিংক আগে থেকেই নেওয়া' : slugFree ? `✓ খালি আছে: ${window.location.origin}/?store=${f.slug}` : 'দেখা হচ্ছে…'}
          </p></div>
        <div><label htmlFor="sc-type" className={label}>ব্যবসার ধরন</label>
          <select id="sc-type" className={input} value={f.businessType} onChange={(e) => set('businessType', e.target.value)}>
            <option value="">বেছে নিন (ঐচ্ছিক)</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></div>
        <div><p className={label}>প্ল্যান</p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="প্ল্যান">
            {[['trial', 'ফ্রি ট্রায়াল'], ['no_expiry', 'মেয়াদ ছাড়া']].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={f.plan === k} onClick={() => set('plan', k)}
                className={`rounded-lg px-3 py-2.5 text-sm font-bold border ${f.plan === k ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'border-slate-700 text-slate-300'}`}>{l}</button>
            ))}
          </div></div>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3">{busy ? 'তৈরি হচ্ছে…' : 'দোকান তৈরি করুন'}</button>
      </form>
      {done && (
        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-sm font-bold text-emerald-300 mb-2">✅ দোকান তৈরি হয়েছে! এই তথ্যগুলো মালিককে পাঠিয়ে দিন:</p>
          <pre className="whitespace-pre-wrap break-all text-sm text-slate-200 font-mono">{credText}</pre>
          <button type="button" onClick={() => navigator.clipboard.writeText(credText).then(() => toast.success('কপি হয়েছে')).catch(() => toast.error('কপি করা যায়নি, নিজে লিখে নিন'))}
            className="mt-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold px-4 py-2.5">সব কপি করুন</button>
        </div>
      )}
    </section>
  );
}
