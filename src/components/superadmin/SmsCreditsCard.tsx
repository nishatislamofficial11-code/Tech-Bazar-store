import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Coins } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ShopLite { id: string; name: string; slug: string }
const input = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';

/** Super admin: SMS price and adding bought SMS to a shop's balance. */
export function SmsCreditsCard({ stores }: { stores: ShopLite[] }) {
  const [price, setPrice] = useState('0.50');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [taka, setTaka] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const load = async () => {
    const [p, w] = await Promise.all([
      supabase.from('platform_settings').select('value').eq('key', 'sms_price').maybeSingle(),
      supabase.from('sms_wallets').select('store_id, balance'),
    ]);
    if (p.data?.value) setPrice(p.data.value);
    setBalances(Object.fromEntries(((w.data || []) as { store_id: string; balance: number }[]).map((r) => [r.store_id, r.balance])));
  };
  useEffect(() => { load(); }, []);

  const savePrice = async () => {
    const v = Number(price);
    if (!(v > 0)) return toast.error('সঠিক দাম দিন');
    setBusy('price');
    const { error } = await supabase.from('platform_settings').upsert({ key: 'sms_price', value: v.toFixed(2), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setBusy('');
    if (error) return toast.error(error.message);
    toast.success('SMS-এর দাম সেভ হয়েছে');
  };

  const add = async (s: ShopLite) => {
    const tk = Number(taka[s.id]);
    const unit = Number(price) || 0.5;
    const count = Math.floor(tk / unit);
    if (!(count > 0)) return toast.error('টাকার পরিমাণ দিন');
    if (!window.confirm(`${s.name}: ৳${tk} পেয়েছেন → ${count}টা SMS যোগ হবে। নিশ্চিত?`)) return;
    setBusy(s.id);
    const { data, error } = await supabase.rpc('super_add_sms', { p_store: s.id, p_count: count, p_amount: tk, p_note: 'manual payment' });
    setBusy('');
    if (error) return toast.error(error.message);
    setBalances((b) => ({ ...b, [s.id]: Number(data) }));
    setTaka((t) => ({ ...t, [s.id]: '' }));
    toast.success(`${count}টা SMS যোগ হয়েছে`);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold flex items-center gap-2"><Coins className="h-5 w-5 text-emerald-400" />দোকানের SMS ব্যালান্স</h2>
        <p className="mt-1 text-xs text-slate-400">দোকানগুলো আপনার কাছ থেকে SMS কেনে; SMS যায় উপরের BulkSMSBD অ্যাকাউন্ট দিয়ে। কেউ টাকা পাঠালে এখানে টাকার পরিমাণ লিখে যোগ করুন (অনলাইন পেমেন্ট চালু হলে নিজে থেকেই যোগ হবে)।</p>
      </div>
      <div className="flex items-end gap-2">
        <label className="flex-1 block text-xs text-slate-300">প্রতি SMS-এর দাম (৳)
          <input type="number" step="0.01" min={0.01} value={price} onChange={(e) => setPrice(e.target.value)} className={`${input} mt-1`} />
        </label>
        <button onClick={savePrice} disabled={!!busy} className="rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold px-4 py-2 disabled:opacity-50">সেভ</button>
      </div>
      <div className="space-y-2">
        {stores.length === 0 && <p className="text-sm text-slate-500">কোনো দোকান নেই</p>}
        {stores.map((s) => {
          const tk = Number(taka[s.id]) || 0;
          const count = Math.floor(tk / (Number(price) || 0.5));
          return (
            <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{s.name}</p>
                  <p className="text-xs text-slate-500">/{s.slug}</p>
                </div>
                <p className="text-sm font-bold text-emerald-300 shrink-0">{(balances[s.id] ?? 0).toLocaleString('en-US')} SMS</p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input type="number" min={0} value={taka[s.id] || ''} onChange={(e) => setTaka((t) => ({ ...t, [s.id]: e.target.value }))} placeholder="পাওয়া টাকা ৳" aria-label="পাওয়া টাকা" className={`${input} flex-1`} />
                <button onClick={() => add(s)} disabled={busy === s.id || !(count > 0)} className="shrink-0 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-2 disabled:opacity-40">
                  {count > 0 ? `+${count} SMS` : 'যোগ করুন'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
