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
  const [vals, setVals] = useState({ signup_mode: 'auto', trial_days: '30', plan_name: 'Cloud Commerce', plan_price: '' });
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
