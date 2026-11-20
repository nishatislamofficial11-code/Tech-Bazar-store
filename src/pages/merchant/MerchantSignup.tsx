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
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [phoneCheck, setPhoneCheck] = useState(true);
  const checkSeq = useRef(0);

  // Is phone verification switched on in the super admin?
  useEffect(() => {
    rawSupabase.from('platform_settings').select('value').eq('key', 'phone_verification').maybeSingle()
      .then(({ data }) => setPhoneCheck((data?.value ?? 'on') === 'on'));
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const otpRequest = async (action: 'send' | 'verify') => {
    const res = await fetch('/api/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, phone: normalizePhone(phone), code: otp }),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok || !out?.ok) throw new Error(out?.error || 'সার্ভারে সমস্যা, আবার চেষ্টা করুন।');
  };

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
    try {
      if (phoneCheck) {
        await otpRequest('send');
        setOtp(''); setStep('otp'); setResendIn(60);
        return;
      }
      await finishSignup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(''); setBusy(true);
    try { await otpRequest('send'); setResendIn(60); }
    catch (err) { setError(err instanceof Error ? err.message : 'কোড পাঠানো যায়নি'); }
    finally { setBusy(false); }
  };

  const verifyAndFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp)) { setError('৬ সংখ্যার কোড দিন।'); return; }
    setBusy(true);
    try {
      await otpRequest('verify');
      await finishSignup();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  // Create the login account, then the store (phone is already verified on the server)
  const finishSignup = async () => {
    const cleanPhone = normalizePhone(phone);
    const pending = { name: storeName.trim(), slug, phone: cleanPhone, business_type: businessType };
    {
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
        // Email already has an account (e.g. as a shopper): sign in with it and open the store on it
        const { error: inErr } = await rawSupabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (inErr) throw new Error('এই ইমেইল দিয়ে আগেই একাউন্ট খোলা আছে, কিন্তু পাসওয়ার্ড মেলেনি। লগইন পেজ থেকে চেষ্টা করুন।');
        const created = await createMyStore({ ...pending, ownerName: ownerName.trim() });
        openStoreAdmin(created.slug);
        return;
      }
      if (data.session) {
        // Email confirmation is off: create the store right away
        const created = await createMyStore({ ...pending, ownerName: ownerName.trim() });
        openStoreAdmin(created.slug);
        return;
      }
      setSentTo(email.trim().toLowerCase());
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

  if (step === 'otp') {
    return (
      <MerchantShell title="মোবাইল নম্বর যাচাই" subtitle={`${normalizePhone(phone)} নম্বরে একটা ৬ সংখ্যার কোড পাঠানো হয়েছে।`}>
        <form onSubmit={verifyAndFinish} className="space-y-4">
          <div>
            <label htmlFor="otp" className={labelCls}>যাচাই কোড</label>
            <input id="otp" className={`${inputCls} text-center text-2xl tracking-[0.5em]`} value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" placeholder="------" autoFocus />
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'যাচাই হচ্ছে…' : 'যাচাই করে দোকান খুলুন'}</button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" className="font-semibold text-[#3a3fd4]" onClick={() => { setStep('form'); setError(''); }}>নম্বর বদলান</button>
            <button type="button" disabled={busy || resendIn > 0} onClick={resend} className="font-semibold text-[#3a3fd4] disabled:text-[#59607a]">
              {resendIn > 0 ? `আবার কোড পাঠান (${resendIn})` : 'আবার কোড পাঠান'}
            </button>
          </div>
        </form>
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
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'অপেক্ষা করুন…' : phoneCheck ? 'মোবাইলে কোড পাঠান' : 'ফ্রি একাউন্ট খুলুন'}</button>
        <p className="text-center text-sm text-[#59607a]">আগেই একাউন্ট আছে? <a href="/merchant/login" className="font-semibold text-[#3a3fd4]">লগইন করুন</a></p>
      </form>
    </MerchantShell>
  );
}
