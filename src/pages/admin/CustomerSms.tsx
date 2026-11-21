import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquareText, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { currentStoreSlug } from '../../lib/currentStore';
import { useSettings } from '../../contexts/SettingsContext';

const DEFAULTS = {
  placed: '{shop}: প্রিয় {name}, আপনার অর্ডার #{order} পেয়েছি। মোট ৳{total}। ধন্যবাদ!',
  shipped: '{shop}: আপনার অর্ডার #{order} কুরিয়ারে পাঠানো হয়েছে। {courier} ট্র্যাকিং: {tracking}',
};
const SAMPLE = { shop: 'আপনার দোকান', name: 'রহিম', order: 'A1B2C3D4', total: '2,150', courier: 'Steadfast', tracking: 'TRK123456' };
const preview = (t: string, shop: string) => t.replace(/\{(shop|name|order|total|courier|tracking)\}/g, (_, k: keyof typeof SAMPLE) => (k === 'shop' && shop ? shop : SAMPLE[k]));
// Bangla SMS: 70 characters per part (67 when split); English: 160 (153)
const parts = (t: string) => {
  const unicode = /[^\x00-\x7F]/.test(t);
  const single = unicode ? 70 : 160; const multi = unicode ? 67 : 153;
  return t.length <= single ? 1 : Math.ceil(t.length / multi);
};

export default function CustomerSms() {
  const { settings, refreshSettings } = useSettings();
  const s = settings as Record<string, string | undefined>;
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [onPlaced, setOnPlaced] = useState(false);
  const [onShipped, setOnShipped] = useState(false);
  const [textPlaced, setTextPlaced] = useState(DEFAULTS.placed);
  const [textShipped, setTextShipped] = useState(DEFAULTS.shipped);
  const [testPhone, setTestPhone] = useState('');
  const [busy, setBusy] = useState('');
  const hasKey = Boolean(s.sms_api_key);
  const shop = s.siteName || s.site_title || '';

  useEffect(() => {
    setSenderId(s.sms_sender_id || '');
    setOnPlaced(s.customer_sms_placed === 'true');
    setOnShipped(s.customer_sms_shipped === 'true');
    setTextPlaced(s.customer_sms_placed_text || DEFAULTS.placed);
    setTextShipped(s.customer_sms_shipped_text || DEFAULTS.shipped);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if ((onPlaced || onShipped) && !hasKey && !apiKey.trim()) return toast.error('SMS চালু করতে API Key দিন');
    if ((onPlaced || onShipped) && !senderId.trim()) return toast.error('Sender ID দিন');
    setBusy('save');
    const rows = [
      { key: 'sms_sender_id', value: senderId.trim() },
      { key: 'customer_sms_placed', value: onPlaced ? 'true' : 'false' },
      { key: 'customer_sms_shipped', value: onShipped ? 'true' : 'false' },
      { key: 'customer_sms_placed_text', value: textPlaced.trim() || DEFAULTS.placed },
      { key: 'customer_sms_shipped_text', value: textShipped.trim() || DEFAULTS.shipped },
      ...(apiKey.trim() ? [{ key: 'sms_api_key', value: apiKey.trim() }] : []),
    ];
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'store_id,key' });
    setBusy('');
    if (error) return toast.error(error.message);
    setApiKey('');
    await refreshSettings();
    toast.success('সেভ হয়েছে');
  };

  const test = async () => {
    setBusy('test');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/order-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ store: currentStoreSlug, action: 'test', phone: testPhone }),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok || !out?.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      toast.success('টেস্ট SMS পাঠানো হয়েছে');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'পাঠানো যায়নি');
    } finally { setBusy(''); }
  };

  const input = 'mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal focus:outline-none focus:border-primary';
  const block = (title: string, desc: string, on: boolean, setOn: (v: boolean) => void, text: string, setText: (v: string) => void) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span>
          <span className="block font-bold text-gray-900">{title}</span>
          <span className="block text-xs text-gray-500">{desc}</span>
        </span>
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={on} onChange={(e) => setOn(e.target.checked)} />
      </label>
      <textarea value={text} rows={3} maxLength={500} onChange={(e) => setText(e.target.value)} className={input} />
      <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <b>দেখতে যেমন হবে:</b> {preview(text, shop)}
        <span className="block mt-1 text-gray-400">{preview(text, shop).length} অক্ষর · প্রায় {parts(preview(text, shop))}টা SMS-এর খরচ</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><MessageSquareText className="h-6 w-6 text-primary" />Customer SMS</h1>
        <p className="text-sm text-gray-500">অর্ডার পেলে আর কুরিয়ারে পাঠালে কাস্টমারকে নিজে থেকেই SMS যাবে। SMS যাবে আপনার নিজের BulkSMSBD অ্যাকাউন্ট থেকে।</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-gray-900">BulkSMSBD অ্যাকাউন্ট</h2>
        <p className="text-xs text-gray-500">bulksmsbd.net-এ অ্যাকাউন্ট খুলে API Key আর Sender ID নিন। API Key শুধু আপনি আর সার্ভার দেখতে পারে।</p>
        <label className="block text-xs font-bold text-gray-600">API Key
          <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={hasKey ? 'সেভ করা আছে — বদলাতে নতুনটা দিন' : 'BulkSMSBD API Key'} className={input} />
        </label>
        <label className="block text-xs font-bold text-gray-600">Sender ID
          <input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="BulkSMSBD Sender ID" className={input} />
        </label>
      </div>

      {block('অর্ডার পেলে SMS', 'ক্যাশ অন ডেলিভারি অর্ডার হলে সাথে সাথে, অনলাইন পেমেন্ট হলে টাকা পাওয়ার পর।', onPlaced, setOnPlaced, textPlaced, setTextPlaced)}
      {block('কুরিয়ারে পাঠালে SMS', 'Steadfast/Pathao-তে পাঠালে বা স্ট্যাটাস Shipped করলে।', onShipped, setOnShipped, textShipped, setTextShipped)}
      <p className="text-xs text-gray-500 -mt-2">লেখায় ব্যবহার করা যাবে: {'{shop}'} দোকানের নাম, {'{name}'} কাস্টমারের নাম, {'{order}'} অর্ডার নম্বর, {'{total}'} মোট টাকা, {'{courier}'} কুরিয়ার, {'{tracking}'} ট্র্যাকিং নম্বর। বাংলা SMS-এ ৭০ অক্ষরে ১টা SMS ধরা হয়।</p>

      <button onClick={save} disabled={!!busy} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl disabled:opacity-50">{busy === 'save' ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
        <h2 className="font-bold text-gray-900">টেস্ট SMS</h2>
        <p className="text-xs text-gray-500">সেভ করার পর নিজের নম্বরে "অর্ডার পেলে" SMS-এর একটা নমুনা পাঠিয়ে দেখুন।</p>
        <div className="flex gap-2">
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" className={`${input} mt-0 flex-1`} />
          <button onClick={test} disabled={!!busy || !testPhone.trim()} className="shrink-0 flex items-center gap-1.5 bg-gray-900 text-white text-sm font-bold px-4 rounded-xl disabled:opacity-50">
            <Send className="h-4 w-4" />{busy === 'test' ? '...' : 'পাঠান'}
          </button>
        </div>
      </div>
    </div>
  );
}
