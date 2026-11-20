import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Plus, RotateCcw, Send, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { aiChatApi } from '../../../lib/aiApi';
import { useSettings } from '../../../contexts/SettingsContext';

function WebsiteChatCard() {
  const { settings, refreshSettings } = useSettings();
  const [busy, setBusy] = useState('');
  const hasNumber = Boolean(settings.whatsapp_number?.trim());
  const toggle = async (key: 'ai_web_chat_enabled' | 'floating_whatsapp_enabled', on: boolean) => {
    setBusy(key);
    const { error } = await supabase.from('settings').upsert({ key, value: on ? 'true' : 'false' }, { onConflict: 'key' });
    setBusy('');
    if (error) return toast.error(error.message);
    await refreshSettings();
    toast.success(on ? 'চালু হয়েছে' : 'বন্ধ হয়েছে');
  };
  const row = (key: 'ai_web_chat_enabled' | 'floating_whatsapp_enabled', title: string, desc: string, disabled = false) => (
    <label className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-sm font-bold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 shrink-0" disabled={disabled || busy === key}
        checked={settings[key] === 'true'} onChange={(e) => toggle(key, e.target.checked)} />
    </label>
  );
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">ওয়েবসাইটের চ্যাট বাটন</h2>
        <p className="text-xs text-gray-500">দুটোই চালু থাকলে বাটনে চাপ দিলে WhatsApp আর AI চ্যাট দুটো অপশন আসবে। একটা চালু থাকলে সরাসরি সেটাই খুলবে।</p>
      </div>
      {row('ai_web_chat_enabled', 'AI চ্যাট', 'ভিজিটর ওয়েবসাইটেই AI-এর সাথে কথা বলতে পারবে। চ্যাটগুলো AI Inbox-এ আসবে।')}
      {row('floating_whatsapp_enabled', 'WhatsApp', hasNumber ? `নম্বর: ${settings.whatsapp_number}` : 'আগে Settings-এ WhatsApp নম্বর দিন', !hasNumber && settings.floating_whatsapp_enabled !== 'true')}
    </div>
  );
}

interface AiSettingsRow {
  enabled: boolean;
  bot_name: string;
  always_rules: string[];
  never_rules: string[];
  handoff_message: string | null;
}
const EMPTY: AiSettingsRow = { enabled: false, bot_name: 'Assistant', always_rules: [], never_rules: [], handoff_message: '' };
const RULE_HINTS = {
  always_rules: ['সবসময় বাংলায় উত্তর দেবে', 'কাস্টমারকে "স্যার/ম্যাম" বলে সম্বোধন করবে', 'অর্ডার নেওয়ার আগে সাইজ নিশ্চিত করবে'],
  never_rules: ['অন্য দোকানের কথা বলবে না', 'নিজে থেকে ছাড় দেওয়ার কথা বলবে না'],
};

function RuleList({ title, hint, rules, onChange }: { title: string; hint: string; rules: string[]; onChange: (r: string[]) => void }) {
  const [text, setText] = useState('');
  const add = (value: string) => {
    const v = value.trim();
    if (!v || rules.includes(v)) return;
    onChange([...rules, v].slice(0, 30));
    setText('');
  };
  return (
    <div>
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mb-2">{hint}</p>
      <div className="space-y-2">
        {rules.map((r, i) => (
          <div key={r} className="flex items-center gap-2">
            <p className="flex-1 text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">{r}</p>
            <button onClick={() => onChange(rules.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-red-50" aria-label="মুছুন"><Trash2 className="h-4 w-4 text-red-500" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text); } }}
            placeholder="নতুন নিয়ম লিখুন" className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <button onClick={() => add(text)} className="px-3 rounded-xl border border-gray-200 hover:bg-gray-50" aria-label="যোগ করুন"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function TestChat({ ready }: { ready: boolean }) {
  const [log, setLog] = useState<{ role: 'me' | 'ai' | 'note'; text: string }[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [log.length]);

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setLog((l) => [...l, { role: 'me', text: msg }]);
    setBusy(true);
    try {
      const out = await aiChatApi<{ reply: string | null; status: string }>({ action: 'test', message: msg });
      setLog((l) => [
        ...l,
        ...(out.reply ? [{ role: 'ai' as const, text: out.reply }] : []),
        ...(out.status === 'needs_human' ? [{ role: 'note' as const, text: 'চ্যাটটা Human Need-এ গেছে। AI Inbox-এ গিয়ে Join করে উত্তর দিন, বা "নতুন করে" চাপুন।' }] : []),
        ...(!out.reply && out.status === 'ai' ? [{ role: 'note' as const, text: 'AI উত্তর দেয়নি। উপরে AI চালু আছে কিনা দেখুন।' }] : []),
      ]);
    } catch (err) {
      setLog((l) => [...l, { role: 'note', text: err instanceof Error ? err.message : 'সমস্যা হয়েছে' }]);
    } finally { setBusy(false); }
  };
  const reset = async () => {
    try { await aiChatApi({ action: 'reset_test' }); setLog([]); } catch (err) { toast.error(err instanceof Error ? err.message : 'হয়নি'); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />টেস্ট চ্যাট</h2>
          <p className="text-xs text-gray-500">কাস্টমার সেজে AI-কে প্রশ্ন করে দেখুন। এখানেও রিপ্লাই লিমিট থেকে গোনা হয়।</p>
        </div>
        <button onClick={reset} className="shrink-0 flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800"><RotateCcw className="h-3.5 w-3.5" />নতুন করে</button>
      </div>
      <div className="h-72 overflow-y-auto rounded-xl bg-gray-50 p-3 space-y-2">
        {log.length === 0 && <p className="text-xs text-gray-400 text-center pt-24">যেমন লিখুন: "এই প্রোডাক্টের দাম কত?"</p>}
        {log.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'me' ? 'justify-start' : m.role === 'ai' ? 'justify-end' : 'justify-center'}`}>
            <p className={`max-w-[85%] text-sm rounded-2xl px-3 py-2 whitespace-pre-wrap ${
              m.role === 'me' ? 'bg-white border border-gray-200' : m.role === 'ai' ? 'bg-primary text-white' : 'bg-amber-50 text-amber-800 text-xs'}`}>{m.text}</p>
          </div>
        ))}
        {busy && <p className="text-xs text-gray-400 text-right">AI লিখছে…</p>}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2">
        <input value={text} disabled={!ready || busy} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={ready ? 'মেসেজ লিখুন…' : 'আগে উপরে AI চালু করে সেভ করুন'} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50" />
        <button onClick={send} disabled={!ready || busy || !text.trim()} className="bg-primary text-white rounded-xl px-4 disabled:opacity-50" aria-label="পাঠান"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function AiSettings() {
  const [row, setRow] = useState<AiSettingsRow>(EMPTY);
  const [storeId, setStoreId] = useState<string | null>(null);
  const exists = storeId !== null;
  const [saved, setSaved] = useState<AiSettingsRow>(EMPTY);
  const [plan, setPlan] = useState<{ active: boolean; monthly_limit: number } | null>(null);
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);
    Promise.all([
      supabase.from('ai_settings').select('store_id, enabled, bot_name, always_rules, never_rules, handoff_message').maybeSingle(),
      supabase.from('ai_store_plans').select('active, monthly_limit').maybeSingle(),
      supabase.from('ai_usage').select('replies').eq('month', month).maybeSingle(),
    ]).then(([s, p, u]) => {
      if (s.data) { const { store_id, ...rest } = s.data; const v = { ...EMPTY, ...rest, handoff_message: rest.handoff_message || '' }; setRow(v); setSaved(v); setStoreId(store_id); }
      setPlan(p.data || null);
      setUsed(u.data?.replies || 0);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const values = { ...row, bot_name: row.bot_name.trim() || 'Assistant', handoff_message: row.handoff_message?.trim() || null, updated_at: new Date().toISOString() };
    const { data, error } = storeId
      ? await supabase.from('ai_settings').update(values).eq('store_id', storeId).select('store_id').single()
      : await supabase.from('ai_settings').insert(values).select('store_id').single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setStoreId(data.store_id);
    setSaved(row);
    toast.success('সেভ হয়েছে');
  };

  if (loading) return <p className="text-center text-sm text-gray-400 py-16">লোড হচ্ছে…</p>;
  const limit = plan?.monthly_limit || 0;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
        <p className="text-sm text-gray-500">AI কীভাবে কাস্টমারের সাথে কথা বলবে, সেটা এখানে ঠিক করুন।</p>
      </div>

      {/* Plan */}
      <div className={`rounded-2xl border p-4 ${plan?.active ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'}`}>
        {plan?.active ? (
          <>
            <div className="flex items-center justify-between text-sm"><span className="font-bold text-gray-900">এই মাসের AI রিপ্লাই</span><span className="text-gray-600">{used} / {limit}</span></div>
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full ${pct >= 90 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} /></div>
            {pct >= 100 && <p className="mt-2 text-xs text-red-600">লিমিট শেষ। নতুন চ্যাটগুলো Human Need-এ যাবে। আরও রিপ্লাই নিতে আমাদের সাথে যোগাযোগ করুন।</p>}
          </>
        ) : (
          <p className="text-sm text-amber-800"><b>AI প্যাক চালু নেই।</b> AI Automation একটা আলাদা প্যাক। চালু করতে আমাদের সাথে যোগাযোগ করুন। প্যাক ছাড়াও এখানে সব সেটআপ করে রাখতে পারবেন।</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span>
            <span className="font-bold text-gray-900 flex items-center gap-2"><Bot className="h-4 w-4 text-primary" />AI অটো রিপ্লাই</span>
            <span className="block text-xs text-gray-500">বন্ধ থাকলে সব মেসেজ শুধু Inbox-এ জমা হবে, AI উত্তর দেবে না।</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-primary,#4f46e5)]" checked={row.enabled} onChange={(e) => setRow({ ...row, enabled: e.target.checked })} />
        </label>

        <label className="block text-xs font-bold text-gray-600">AI-এর নাম (কাস্টমার এই নামে চিনবে)
          <input value={row.bot_name} maxLength={40} onChange={(e) => setRow({ ...row, bot_name: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
        </label>

        <RuleList title="সবসময় করবে" hint={`যেমন: ${RULE_HINTS.always_rules.join(' / ')}`} rules={row.always_rules} onChange={(r) => setRow({ ...row, always_rules: r })} />
        <RuleList title="কখনো করবে না" hint={`যেমন: ${RULE_HINTS.never_rules.join(' / ')}`} rules={row.never_rules} onChange={(r) => setRow({ ...row, never_rules: r })} />
        <p className="text-[11px] text-gray-400">নিয়ম দিয়ে AI-এর কথা বলার ধরন বদলানো যায়, কিন্তু দাম, স্টক বা ছাড় বদলানো যায় না।</p>

        <label className="block text-xs font-bold text-gray-600">এজেন্টের কাছে পাঠানোর সময় কাস্টমারকে যা বলবে (ফাঁকা রাখলে AI নিজে লিখবে)
          <textarea value={row.handoff_message || ''} maxLength={500} rows={2} onChange={(e) => setRow({ ...row, handoff_message: e.target.value })}
            placeholder="আপনার বিষয়টি আমাদের একজন এজেন্টকে জানানো হয়েছে। কিছুক্ষণের মধ্যেই তিনি উত্তর দেবেন।" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
        </label>

        <button onClick={save} disabled={saving} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl disabled:opacity-50">{saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
      </div>

      <WebsiteChatCard />

      <TestChat ready={saved.enabled && exists} />
    </div>
  );
}
