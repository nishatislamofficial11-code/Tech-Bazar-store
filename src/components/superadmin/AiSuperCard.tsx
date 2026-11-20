import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ShopLite { id: string; name: string; slug: string }
interface ShopPlan { active: boolean; monthly_limit: number }

type Provider = 'anthropic' | 'openai' | 'google' | 'groq' | 'openrouter';
const PROVIDERS: { id: Provider; label: string; keyName: string; keyHint: string; site: string; models: string[] }[] = [
  {
    id: 'anthropic', label: 'Claude (Anthropic)', keyName: 'private_anthropic_api_key', keyHint: 'sk-ant-...', site: 'console.anthropic.com',
    models: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-2', 'claude-haiku-4-5', 'claude-sonnet-4-6'],
  },
  {
    id: 'openai', label: 'ChatGPT (OpenAI)', keyName: 'private_openai_api_key', keyHint: 'sk-...', site: 'platform.openai.com',
    models: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4.1'],
  },
  {
    id: 'google', label: 'Gemini (Google)', keyName: 'private_google_api_key', keyHint: 'AIza...', site: 'aistudio.google.com',
    models: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'],
  },
  {
    id: 'groq', label: 'Groq (ফ্রি টেস্ট)', keyName: 'private_groq_api_key', keyHint: 'gsk_...', site: 'console.groq.com',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  {
    id: 'openrouter', label: 'OpenRouter (ফ্রি টেস্ট)', keyName: 'private_openrouter_api_key', keyHint: 'sk-or-...', site: 'openrouter.ai',
    models: ['meta-llama/llama-3.3-70b-instruct:free'],
  },
];
const input = 'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500';

/** Super admin: Claude API key, model, and the AI add-on (on/off + monthly reply limit) for each shop. */
export function AiSuperCard({ stores }: { stores: ShopLite[] }) {
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [model, setModel] = useState('');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [plans, setPlans] = useState<Record<string, ShopPlan>>({});
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState('');
  const [liveModels, setLiveModels] = useState<{ id: string; name: string }[]>([]);
  const current = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  useEffect(() => {
    const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);
    supabase.from('platform_settings').select('key, value')
      .in('key', ['ai_provider', 'ai_model', ...PROVIDERS.map((p) => p.keyName)]).then(({ data }) => {
        const map = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
        if (PROVIDERS.some((p) => p.id === map.ai_provider)) setProvider(map.ai_provider as Provider);
        setModel(map.ai_model || '');
        setSaved(Object.fromEntries(PROVIDERS.map((p) => [p.keyName, Boolean(map[p.keyName])])));
      });
    supabase.from('ai_store_plans').select('store_id, active, monthly_limit').then(({ data }) => {
      setPlans(Object.fromEntries((data || []).map((r: { store_id: string } & ShopPlan) => [r.store_id, { active: r.active, monthly_limit: r.monthly_limit }])));
    });
    supabase.from('ai_usage').select('store_id, replies').eq('month', month).then(({ data }) => {
      setUsage(Object.fromEntries((data || []).map((r: { store_id: string; replies: number }) => [r.store_id, r.replies])));
    });
  }, []);

  const pickProvider = (id: Provider) => {
    setProvider(id);
    setLiveModels([]);
    setModel(PROVIDERS.find((p) => p.id === id)?.models[0] || '');
  };

  const fetchModels = async () => {
    setBusy('models');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ provider, key: keys[current.keyName]?.trim() || '' }),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok || !out?.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      setLiveModels(out.models || []);
      toast.success(`${(out.models || []).length}টা মডেল পাওয়া গেছে, নিচ থেকে বাছুন`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'মডেল তালিকা আনা যায়নি');
    } finally { setBusy(''); }
  };

  const saveKey = async () => {
    const chosenModel = model.trim() || current.models[0];
    if (!saved[current.keyName] && !keys[current.keyName]?.trim()) { toast.error(`${current.label}-এর API Key দিন`); return; }
    setBusy('key');
    const now = new Date().toISOString();
    const rows = [{ key: 'ai_provider', value: provider, updated_at: now }, { key: 'ai_model', value: chosenModel, updated_at: now }];
    for (const p of PROVIDERS) {
      const v = keys[p.keyName]?.trim();
      if (v) rows.push({ key: p.keyName, value: v, updated_at: now });
    }
    const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' });
    setBusy('');
    if (error) return toast.error(error.message);
    setSaved((sv) => ({ ...sv, ...Object.fromEntries(PROVIDERS.filter((p) => keys[p.keyName]?.trim()).map((p) => [p.keyName, true])) }));
    setKeys({});
    setModel(chosenModel);
    toast.success(`এখন সব দোকানে ${current.label} (${chosenModel}) চলবে`);
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
          <h2 className="text-base font-bold flex items-center gap-2"><Bot className="h-5 w-5 text-emerald-400" />AI সেটিংস</h2>
          <p className="mt-1 text-xs text-slate-400">যে AI বেছে নেবেন, সব দোকানের চ্যাট সেটা দিয়েই চলবে। যখন খুশি বদলাতে পারবেন। API Key শুধু আপনি আর সার্ভার দেখতে পারে।</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="AI কোম্পানি">
          {PROVIDERS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={provider === p.id} onClick={() => pickProvider(p.id)}
              className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${provider === p.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
              {p.label}
              <span className={`block mt-1 text-[10px] font-normal ${saved[p.keyName] ? 'text-emerald-400' : 'text-slate-500'}`}>{saved[p.keyName] ? 'Key আছে' : 'Key নেই'}</span>
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="ai-key" className="block text-xs text-slate-300 mb-1">{current.label} API Key <span className="text-slate-500">({current.site} থেকে নিন)</span></label>
          <input id="ai-key" type="password" autoComplete="off" className={input} value={keys[current.keyName] || ''}
            onChange={(e) => setKeys((k) => ({ ...k, [current.keyName]: e.target.value }))}
            placeholder={saved[current.keyName] ? 'সেভ করা আছে — বদলাতে নতুনটা দিন' : current.keyHint} />
        </div>
        <div>
          <label htmlFor="ai-model" className="block text-xs text-slate-300 mb-1">মডেল <span className="text-slate-500">(তালিকা থেকে বাছুন বা নতুন মডেলের নাম লিখুন)</span></label>
          <input id="ai-model" list="ai-model-list" className={input} value={model} onChange={(e) => setModel(e.target.value)} placeholder={current.models[0]} />
          <datalist id="ai-model-list">{current.models.map((m) => <option key={m} value={m} />)}</datalist>
          <button type="button" onClick={fetchModels} disabled={!!busy}
            className="mt-2 w-full rounded-lg border border-slate-700 hover:border-emerald-500 text-slate-200 text-xs font-bold py-2 disabled:opacity-50">
            {busy === 'models' ? 'আনা হচ্ছে…' : 'এই Key দিয়ে চালু থাকা মডেলের তালিকা আনুন'}
          </button>
          {liveModels.length > 0 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800">
              {liveModels.map((m) => (
                <button key={m.id} type="button" onClick={() => setModel(m.id)}
                  className={`w-full text-left px-3 py-2 text-xs ${model === m.id ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <span className="font-mono">{m.id}</span>{m.name !== m.id && <span className="block text-[10px] text-slate-500">{m.name}</span>}
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-500">প্রথমটা সবচেয়ে সস্তা আর দ্রুত, চ্যাটের জন্য যথেষ্ট। বড় মডেল বেশি দামি।</p>
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
