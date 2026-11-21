import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Coins, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseSmsPackages, DEFAULT_SMS_PACKAGES, SmsPackage } from '../../lib/smsPackages';

interface ShopLite { id: string; name: string; slug: string }
const input = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';

/** Super admin: SMS packages shops can buy, and adding a bought package (or any number of SMS) to a shop. */
export function SmsCreditsCard({ stores }: { stores: ShopLite[] }) {
  const [packages, setPackages] = useState<SmsPackage[]>(DEFAULT_SMS_PACKAGES);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('platform_settings').select('value').eq('key', 'sms_packages').maybeSingle(),
      supabase.from('sms_wallets').select('store_id, balance'),
    ]).then(([p, w]) => {
      setPackages(parseSmsPackages(p.data?.value));
      setBalances(Object.fromEntries(((w.data || []) as { store_id: string; balance: number }[]).map((r) => [r.store_id, r.balance])));
    });
  }, []);

  const savePackages = async () => {
    const clean = packages.filter((p) => p.price > 0 && p.sms > 0);
    if (!clean.length) return toast.error('কমপক্ষে একটা প্যাকেজ দিন');
    setBusy('pkg');
    const { error } = await supabase.from('platform_settings').upsert({ key: 'sms_packages', value: JSON.stringify(clean), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setBusy('');
    if (error) return toast.error(error.message);
    setPackages(parseSmsPackages(JSON.stringify(clean)));
    toast.success('প্যাকেজ সেভ হয়েছে');
  };

  const add = async (s: ShopLite, count: number, amount: number | null, label: string) => {
    if (!(count > 0)) return toast.error('SMS সংখ্যা দিন');
    if (!window.confirm(`${s.name}: ${label} → ${count}টা SMS যোগ হবে। নিশ্চিত?`)) return;
    setBusy(s.id);
    const { data, error } = await supabase.rpc('super_add_sms', { p_store: s.id, p_count: count, p_amount: amount, p_note: label });
    setBusy('');
    if (error) return toast.error(error.message);
    setBalances((b) => ({ ...b, [s.id]: Number(data) }));
    setCustom((c) => ({ ...c, [s.id]: '' }));
    toast.success(`${count}টা SMS যোগ হয়েছে`);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold flex items-center gap-2"><Coins className="h-5 w-5 text-emerald-400" />SMS প্যাকেজ ও দোকানের ব্যালান্স</h2>
        <p className="mt-1 text-xs text-slate-400">দোকানগুলো এই প্যাকেজ কিনবে; তারা শুধু কয়টা SMS আছে দেখে। দোকানদারকে আপনার পাঠানো SMS (ট্রায়াল/প্যাকেজ শেষের খবর) ফ্রি — তাদের ব্যালান্স থেকে কাটে না।</p>
      </div>

      <div className="space-y-2">
        {packages.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="flex-1 text-[11px] text-slate-400">দাম ৳
              <input type="number" min={1} value={p.price || ''} onChange={(e) => setPackages((l) => l.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} className={`${input} mt-0.5`} />
            </label>
            <label className="flex-1 text-[11px] text-slate-400">SMS
              <input type="number" min={1} value={p.sms || ''} onChange={(e) => setPackages((l) => l.map((x, j) => (j === i ? { ...x, sms: Number(e.target.value) } : x)))} className={`${input} mt-0.5`} />
            </label>
            <button onClick={() => setPackages((l) => l.filter((_, j) => j !== i))} className="mt-4 p-2 rounded-lg hover:bg-slate-800" aria-label="প্যাকেজ মুছুন"><Trash2 className="h-4 w-4 text-red-400" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={() => setPackages((l) => [...l, { price: 0, sms: 0 }])} className="flex items-center gap-1 rounded-lg border border-slate-700 text-slate-200 text-xs font-bold px-3 py-2"><Plus className="h-4 w-4" />প্যাকেজ যোগ</button>
          <button onClick={savePackages} disabled={!!busy} className="flex-1 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold py-2 disabled:opacity-50">{busy === 'pkg' ? 'সেভ হচ্ছে…' : 'প্যাকেজ সেভ করুন'}</button>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800">
        <p className="text-xs text-slate-400">কেউ টাকা পাঠালে তার দোকানে প্যাকেজটায় চাপ দিন:</p>
        {stores.length === 0 && <p className="text-sm text-slate-500">কোনো দোকান নেই</p>}
        {stores.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{s.name}</p>
                <p className="text-xs text-slate-500">/{s.slug}</p>
              </div>
              <p className="text-sm font-bold text-emerald-300 shrink-0">{(balances[s.id] ?? 0).toLocaleString('en-US')} SMS</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {packages.filter((p) => p.price > 0 && p.sms > 0).map((p) => (
                <button key={`${p.price}-${p.sms}`} disabled={busy === s.id} onClick={() => add(s, p.sms, p.price, `package ৳${p.price}`)}
                  className="rounded-lg border border-slate-700 hover:border-emerald-500 text-xs font-bold px-2.5 py-1.5 disabled:opacity-40">
                  +{p.sms} <span className="text-slate-400 font-normal">(৳{p.price})</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={custom[s.id] || ''} onChange={(e) => setCustom((c) => ({ ...c, [s.id]: e.target.value }))} placeholder="অন্য সংখ্যা (বাদ দিতে − দিন)" aria-label="SMS সংখ্যা" className={`${input} flex-1`} />
              <button disabled={busy === s.id || !Number(custom[s.id])} onClick={() => {
                const n = Math.trunc(Number(custom[s.id]));
                if (n < 0) {
                  if (!window.confirm(`${s.name} থেকে ${-n}টা SMS বাদ দেবেন?`)) return;
                  setBusy(s.id);
                  supabase.rpc('super_add_sms', { p_store: s.id, p_count: n, p_amount: null, p_note: 'adjustment' }).then(({ data, error }) => {
                    setBusy('');
                    if (error) return toast.error(error.message);
                    setBalances((b) => ({ ...b, [s.id]: Number(data) }));
                    setCustom((c) => ({ ...c, [s.id]: '' }));
                  });
                } else add(s, n, null, 'manual');
              }} className="shrink-0 rounded-lg bg-slate-700 text-white text-xs font-bold px-3 py-2 disabled:opacity-40">ঠিক করুন</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
