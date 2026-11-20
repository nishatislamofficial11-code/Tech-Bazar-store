import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ShopLite { id: string; name: string; slug: string }
interface ShopPlan { active: boolean; monthly_limit: number }

const MODELS = [
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (সস্তা, দ্রুত — প্রস্তাবিত)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (বেশি দামি, বেশি দক্ষ)' },
];
const input = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';

/** Super admin: Claude API key, model, and the AI add-on (on/off + monthly reply limit) for each shop. */
export function AiSuperCard({ stores }: { stores: ShopLite[] }) {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);
  const [plans, setPlans] = useState<Record<string, ShopPlan>>({});
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);
    supabase.from('platform_settings').select('key, value').in('key', ['private_anthropic_api_key', 'ai_model']).then(({ data }) => {
      const map = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
      setHasKey(Boolean(map.private_anthropic_api_key));
      if (map.ai_model) setModel(map.ai_model);
    });
    supabase.from('ai_store_plans').select('store_id, active, monthly_limit').then(({ data }) => {
      setPlans(Object.fromEntries((data || []).map((r: { store_id: string } & ShopPlan) => [r.store_id, { active: r.active, monthly_limit: r.monthly_limit }])));
    });
    supabase.from('ai_usage').select('store_id, replies').eq('month', month).then(({ data }) => {
      setUsage(Object.fromEntries((data || []).map((r: { store_id: string; replies: number }) => [r.store_id, r.replies])));
    });
  }, []);

  const saveKey = async () => {
    setBusy('key');
    const now = new Date().toISOString();
    const rows = [{ key: 'ai_model', value: model, updated_at: now }];
    if (apiKey.trim()) rows.push({ key: 'private_anthropic_api_key', value: apiKey.trim(), updated_at: now });
    const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' });
    setBusy('');
    if (error) return toast.error(error.message);
    if (apiKey.trim()) setHasKey(true);
    setApiKey('');
    toast.success('AI সেটিংস সেভ হয়েছে');
  };

  const savePlan = async (storeId: string, plan: ShopPlan) => {
    setBusy(storeId);
    const { error } = await supabase.from('ai_store_plans').upsert({ store_id: storeId, ...plan, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
    setBusy('');
    if (error) return toast.error(error.message);
    setPlans((p) => ({ ...p, [storeId]: plan }));
    toast.success('সেভ হয়েছে');
  };

  return (
    <div className="space-y-5">
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2"><Bot className="h-5 w-5 text-emerald-400" />AI (Claude) সেটিংস</h2>
          <p className="mt-1 text-xs text-slate-400">সব দোকানের AI এই একটা Claude API Key দিয়ে চলবে। Key শুধু আপনি আর সার্ভার দেখতে পারে। console.anthropic.com থেকে Key নিন।</p>
        </div>
        <div>
          <label htmlFor="ai-key" className="block text-xs text-slate-300 mb-1">Claude API Key</label>
          <input id="ai-key" type="password" autoComplete="off" className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? 'সেভ করা আছে — বদলাতে নতুনটা দিন' : 'sk-ant-...'} />
        </div>
        <div>
          <label htmlFor="ai-model" className="block text-xs text-slate-300 mb-1">মডেল</label>
          <select id="ai-model" className={input} value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <button onClick={saveKey} disabled={!!busy} className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-sm">{busy === 'key' ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div>
          <h2 className="text-base font-bold">দোকান অনুযায়ী AI প্যাক</h2>
          <p className="mt-1 text-xs text-slate-400">যে দোকান AI প্যাক কিনেছে, তার জন্য চালু করুন আর মাসিক রিপ্লাই লিমিট দিন। লিমিট শেষ হলে চ্যাট এজেন্টের কাছে যাবে।</p>
        </div>
        {stores.length === 0 && <p className="text-sm text-slate-500">কোনো দোকান নেই</p>}
        {stores.map((s) => {
          const plan = plans[s.id] || { active: false, monthly_limit: 1000 };
          return (
            <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{s.name}</p>
                <p className="text-xs text-slate-500">/{s.slug} · এই মাসে {usage[s.id] || 0} রিপ্লাই</p>
              </div>
              <input type="number" min={0} step={100} aria-label="মাসিক লিমিট" value={plan.monthly_limit}
                onChange={(e) => setPlans((p) => ({ ...p, [s.id]: { ...plan, monthly_limit: Math.max(0, Number(e.target.value) || 0) } }))}
                className="w-24 rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white" />
              <label className="flex items-center gap-1.5 text-xs text-slate-300">
                <input type="checkbox" checked={plan.active} onChange={(e) => setPlans((p) => ({ ...p, [s.id]: { ...plan, active: e.target.checked } }))} />চালু
              </label>
              <button onClick={() => savePlan(s.id, plan)} disabled={busy === s.id} className="rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1.5 disabled:opacity-50">সেভ</button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
