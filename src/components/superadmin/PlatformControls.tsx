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
  { group: 'প্রথম অংশ (হিরো)', key: 'landing_badge', label: 'ছোট ব্যাজ', hint: 'বাংলাদেশি ব্যবসার জন্য বানানো' },
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
