import React, { useEffect, useRef, useState } from 'react';
import { rawSupabase } from '../../lib/supabase';
import {
  SLUG_RE, PHONE_RE, suggestSlug, normalizePhone, isSlugAvailable, createMyStore, openStoreAdmin,
} from '../../lib/platform';
import MerchantShell, { inputCls, labelCls, primaryBtn } from './MerchantShell';

const BUSINESS_TYPES = ['পোশাক ও ফ্যাশন', 'ইলেকট্রনিক্স ও গ্যাজেট', 'কসমেটিকস ও বিউটি', 'খাবার ও গ্রোসারি', 'ঘর ও ফার্নিচার', 'বই ও স্টেশনারি', 'অন্যান্য'];

type SlugState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';

export default function MerchantSignup() {
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [businessType, setBusinessType] = useState('');
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const checkSeq = useRef(0);

  // Suggest a link from the store name until the owner edits it
  useEffect(() => { if (!slugTouched) setSlug(suggestSlug(storeName)); }, [storeName, slugTouched]);

  // Check the link is free (debounced)
  useEffect(() => {
    if (!slug) { setSlugState('idle'); return; }
    if (!SLUG_RE.test(slug)) { setSlugState('invalid'); return; }
    setSlugState('checking');
    const seq = ++checkSeq.current;
    const t = setTimeout(async () => {
      try {
        const free = await isSlugAvailable(slug);
        if (seq === checkSeq.current) setSlugState(free ? 'free' : 'taken');
      } catch { if (seq === checkSeq.current) setSlugState('idle'); }
    }, 450);
    return () => clearTimeout(t);
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = normalizePhone(phone);
    if (ownerName.trim().length < 2) return setError('আপনার নাম লিখুন।');
    if (!PHONE_RE.test(cleanPhone)) return setError('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।');
    if (password.length < 8) return setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।');
    if (storeName.trim().length < 2) return setError('দোকানের নাম লিখুন।');
    if (!SLUG_RE.test(slug)) return setError('দোকানের লিংকে শুধু ইংরেজি ছোট অক্ষর, সংখ্যা আর - দিন (৩-৪০ অক্ষর)।');
    if (slugState === 'taken') return setError('এই লিংক আগে থেকেই নেওয়া, অন্য একটা দিন।');

    setBusy(true);
    const pending = { name: storeName.trim(), slug, phone: cleanPhone, business_type: businessType };
    try {
      const { data, error: signErr } = await rawSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: ownerName.trim(), phone: cleanPhone, pending_store: pending },
          emailRedirectTo: `${window.location.origin}/merchant/login?verified=1`,
        },
      });
      if (signErr) throw signErr;
      // Supabase returns a user with no identities when the email is already registered
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('এই ইমেইল দিয়ে আগেই একাউন্ট খোলা আছে। লগইন করুন।');
      }
      if (data.session) {
        // Email confirmation is off: create the store right away
        const created = await createMyStore({ ...pending, ownerName: ownerName.trim() });
        openStoreAdmin(created.slug);
        return;
      }
      setSentTo(email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'একাউন্ট খোলা যায়নি, আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <MerchantShell title="ইমেইল চেক করুন" subtitle="আর একটা ধাপ বাকি">
        <div className="space-y-4 text-[15px] leading-relaxed">
          <p><b>{sentTo}</b> ঠিকানায় একটা যাচাইয়ের লিংক পাঠানো হয়েছে। লিংকে চাপলেই আপনার দোকান তৈরি হয়ে ৩০ দিনের ফ্রি ট্রায়াল শুরু হবে।</p>
          <p className="text-[#59607a]">ইমেইল না পেলে Spam বা Promotions ফোল্ডার দেখুন।</p>
          <a href="/merchant/login" className={primaryBtn}>লগইন পেজে যান</a>
        </div>
      </MerchantShell>
    );
  }

  const slugHint: Record<SlugState, { text: string; cls: string }> = {
    idle: { text: 'ইংরেজি ছোট অক্ষর, সংখ্যা আর - দিয়ে', cls: 'text-[#59607a]' },
    checking: { text: 'দেখা হচ্ছে…', cls: 'text-[#59607a]' },
    free: { text: '✓ লিংকটা খালি আছে', cls: 'text-emerald-600' },
    taken: { text: '✗ এই লিংক আগে থেকেই নেওয়া', cls: 'text-red-600' },
    invalid: { text: 'শুধু ইংরেজি ছোট অক্ষর, সংখ্যা আর - (৩-৪০ অক্ষর)', cls: 'text-red-600' },
  };

  return (
    <MerchantShell title="৩০ দিন ফ্রি শুরু করুন" subtitle="কোনো কার্ড লাগবে না। ৫ মিনিটে দোকান চালু।">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="ownerName" className={labelCls}>আপনার নাম</label>
          <input id="ownerName" className={inputCls} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="name" required />
        </div>
        <div>
          <label htmlFor="phone" className={labelCls}>মোবাইল নম্বর</label>
          <input id="phone" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>ইমেইল</label>
          <input id="email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>পাসওয়ার্ড</label>
          <input id="password" type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="কমপক্ষে ৮ অক্ষর" required />
        </div>
        <hr className="border-[#e1e4f3]" />
        <div>
          <label htmlFor="storeName" className={labelCls}>দোকান বা কোম্পানির নাম</label>
          <input id="storeName" className={inputCls} value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="slug" className={labelCls}>দোকানের লিংক</label>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-[#e1e4f3] focus-within:border-[#3a3fd4] focus-within:ring-4 focus-within:ring-[#3a3fd4]/15">
            <span className="flex items-center bg-[#f1f2fb] px-3 text-sm text-[#59607a]">?store=</span>
            <input id="slug" className="min-w-0 flex-1 px-3 py-3 text-[15px] outline-none" value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); }}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="my-shop" required />
          </div>
          <p className={`mt-1.5 text-sm ${slugHint[slugState].cls}`} aria-live="polite">{slugHint[slugState].text}</p>
        </div>
        <div>
          <label htmlFor="btype" className={labelCls}>ব্যবসার ধরন <span className="font-normal text-[#59607a]">(ঐচ্ছিক)</span></label>
          <select id="btype" className={inputCls} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            <option value="">বেছে নিন</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'একাউন্ট খোলা হচ্ছে…' : 'ফ্রি একাউন্ট খুলুন'}</button>
        <p className="text-center text-sm text-[#59607a]">আগেই একাউন্ট আছে? <a href="/merchant/login" className="font-semibold text-[#3a3fd4]">লগইন করুন</a></p>
      </form>
    </MerchantShell>
  );
}
