import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquareText, Send, ShoppingCart, X } from 'lucide-react';
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
  const [balance, setBalance] = useState<number | null>(null);
  const [price, setPrice] = useState(0.5);
  const [history, setHistory] = useState<{ id: number; change: number; amount_tk: number | null; reason: string; created_at: string }[]>([]);
  const [contact, setContact] = useState<{ phone?: string; whatsapp?: string }>({});
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyTk, setBuyTk] = useState('500');
  const [onPlaced, setOnPlaced] = useState(false);
  const [onShipped, setOnShipped] = useState(false);
  const [textPlaced, setTextPlaced] = useState(DEFAULTS.placed);
  const [textShipped, setTextShipped] = useState(DEFAULTS.shipped);
  const [testPhone, setTestPhone] = useState('');
  const [busy, setBusy] = useState('');
  const shop = s.siteName || s.site_title || '';

  const loadWallet = async () => {
    const [w, h, ps] = await Promise.all([
      supabase.from('sms_wallets').select('balance').maybeSingle(),
      supabase.from('sms_transactions').select('id, change, amount_tk, reason, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('platform_settings').select('key, value').in('key', ['sms_price', 'contact_phone', 'contact_whatsapp']),
    ]);
    setBalance(w.data?.balance ?? 0);
    setHistory((h.data || []) as typeof history);
    const m = Object.fromEntries(((ps.data || []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
    if (Number(m.sms_price) > 0) setPrice(Number(m.sms_price));
    setContact({ phone: m.contact_phone, whatsapp: m.contact_whatsapp });
  };
  useEffect(() => { loadWallet(); }, []);

  useEffect(() => {
    setOnPlaced(s.customer_sms_placed === 'true');
    setOnShipped(s.customer_sms_shipped === 'true');
    setTextPlaced(s.customer_sms_placed_text || DEFAULTS.placed);
    setTextShipped(s.customer_sms_shipped_text || DEFAULTS.shipped);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setBusy('save');
    const rows = [
      { key: 'customer_sms_placed', value: onPlaced ? 'true' : 'false' },
      { key: 'customer_sms_shipped', value: onShipped ? 'true' : 'false' },
      { key: 'customer_sms_placed_text', value: textPlaced.trim() || DEFAULTS.placed },
      { key: 'customer_sms_shipped_text', value: textShipped.trim() || DEFAULTS.shipped },
    ];
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'store_id,key' });
    setBusy('');
    if (error) return toast.error(error.message);
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
      loadWallet();
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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><MessageSquareText className="h-6 w-6 text-primary" />SMS Setup</h1>
        <p className="text-sm text-gray-500">অর্ডার পেলে আর কুরিয়ারে পাঠালে কাস্টমারকে নিজে থেকেই SMS যাবে। প্রতিটা SMS আপনার SMS ব্যালান্স থেকে কাটা হবে।</p>
      </div>

      <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-primary to-indigo-700 shadow-sm">
        <p className="text-sm opacity-80">আপনার SMS ব্যালান্স</p>
        <p className="mt-1 text-4xl font-black">{balance === null ? '…' : balance.toLocaleString('en-US')} <span className="text-base font-semibold opacity-80">SMS</span></p>
        <p className="mt-1 text-xs opacity-80">প্রতি SMS ৳{price.toFixed(2)} · বাংলা SMS-এ ৭০ অক্ষর = ১টা SMS</p>
        <button onClick={() => setBuyOpen(true)} className="mt-4 flex items-center gap-2 bg-white text-primary font-bold text-sm px-4 py-2 rounded-xl">
          <ShoppingCart className="h-4 w-4" />SMS কিনুন
        </button>
        {balance === 0 && (onPlaced || onShipped) && <p className="mt-3 text-xs bg-white/15 rounded-lg px-3 py-2">ব্যালান্স শূন্য, তাই এখন কোনো SMS যাবে না। SMS কিনলে সাথে সাথে চালু হবে।</p>}
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
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-2">সাম্প্রতিক হিসাব</h2>
          <div className="divide-y divide-gray-50 text-sm">
            {history.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2">
                <span className="text-gray-600">
                  {t.reason === 'purchase' ? 'SMS কেনা' : t.reason.startsWith('refund') ? 'ফেরত (পাঠানো যায়নি)' : t.reason === 'test' ? 'টেস্ট SMS' : t.reason === 'order placed' ? 'অর্ডার SMS' : t.reason === 'order shipped' ? 'কুরিয়ার SMS' : t.reason}
                  <span className="block text-[11px] text-gray-400">{new Date(t.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}</span>
                </span>
                <span className={`font-bold ${t.change > 0 ? 'text-emerald-600' : 'text-gray-700'}`}>{t.change > 0 ? '+' : ''}{t.change}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {buyOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setBuyOpen(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">SMS কিনুন</h2>
              <button onClick={() => setBuyOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="বন্ধ"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['200', '500', '1000'].map((v) => (
                <button key={v} onClick={() => setBuyTk(v)} className={`rounded-xl border py-2 text-sm font-bold ${buyTk === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-700'}`}>৳{v}</button>
              ))}
            </div>
            <label className="block text-xs font-bold text-gray-600">টাকার পরিমাণ
              <input type="number" min={50} value={buyTk} onChange={(e) => setBuyTk(e.target.value)} className={input} />
            </label>
            <p className="text-sm text-gray-700">আপনি পাবেন <b>{Math.floor((Number(buyTk) || 0) / price).toLocaleString('en-US')}টা SMS</b></p>
            <div className="rounded-xl bg-amber-50 text-amber-800 text-xs p-3">
              অনলাইনে (বিকাশ/কার্ড) সরাসরি কেনার ব্যবস্থা খুব শীঘ্রই চালু হচ্ছে। এখন কিনতে আমাদের সাথে যোগাযোগ করুন, টাকা পাঠালে সাথে সাথে ব্যালান্স যোগ হয়ে যাবে।
              {(contact.whatsapp || contact.phone) && (
                <span className="block mt-1 font-bold">{contact.whatsapp ? `WhatsApp: ${contact.whatsapp}` : ''}{contact.whatsapp && contact.phone ? ' · ' : ''}{contact.phone ? `ফোন: ${contact.phone}` : ''}</span>
              )}
            </div>
            <button disabled className="w-full bg-gray-200 text-gray-500 font-bold py-2.5 rounded-xl cursor-not-allowed">অনলাইনে পেমেন্ট (শীঘ্রই)</button>
          </div>
        </div>
      )}
    </div>
  );
}
