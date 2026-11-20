import React, { useEffect, useState } from 'react';
import { rawSupabase } from '../../lib/supabase';
import { getMyStore, createMyStore, isSuperAdmin, openStoreAdmin, type PendingStore } from '../../lib/platform';
import MerchantShell, { inputCls, labelCls, primaryBtn } from './MerchantShell';

// One login for every store owner: finds their store and opens its admin panel.
export default function MerchantLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  // After login (or arriving from the email-verification link with a session), send the owner to their store
  const routeToStore = async () => {
    const store = await getMyStore();
    if (store) {
      // A store awaiting approval still opens its admin; a banner there explains the wait
      if (store.status === 'rejected') {
        setError('আপনার আবেদন গ্রহণ করা হয়নি। বিস্তারিত জানতে আমাদের সাথে যোগাযোগ করুন।');
        await rawSupabase.auth.signOut();
        return;
      }
      openStoreAdmin(store.slug);
      return;
    }
    if (await isSuperAdmin()) { window.location.assign('/super-admin'); return; }

    // Email just verified: finish creating the store saved at sign-up
    const { data: { user } } = await rawSupabase.auth.getUser();
    const pending = user?.user_metadata?.pending_store as PendingStore | undefined;
    if (pending?.slug) {
      const created = await createMyStore({ ...pending, ownerName: user?.user_metadata?.full_name || '' });
      openStoreAdmin(created.slug);
      return;
    }
    await rawSupabase.auth.signOut();
    setError('এই একাউন্টে কোনো দোকান নেই। নতুন দোকান খুলতে ফ্রি একাউন্ট খুলুন।');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified')) setInfo('ইমেইল যাচাই হয়েছে। এবার লগইন করুন।');
    // Coming back from the email link usually signs the user in already
    rawSupabase.auth.getSession().then(({ data }) => {
      if (data.session && params.get('verified')) {
        setBusy(true);
        routeToStore().catch((e) => setError(e instanceof Error ? e.message : 'সমস্যা হয়েছে')).finally(() => setBusy(false));
      }
    });
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      const { error: err } = await rawSupabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (err) {
        throw new Error(/confirm/i.test(err.message) ? 'আগে ইমেইলে পাঠানো লিংকে চেপে একাউন্ট যাচাই করুন।'
          : /invalid/i.test(err.message) ? 'ইমেইল বা পাসওয়ার্ড ভুল।' : err.message);
      }
      await routeToStore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন করা যায়নি');
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    const { error: err } = await rawSupabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/merchant/reset`,
    });
    setBusy(false);
    if (err) setError(err.message);
    else setInfo('পাসওয়ার্ড বদলানোর লিংক ইমেইলে পাঠানো হয়েছে।');
  };

  return (
    <MerchantShell title={mode === 'login' ? 'আপনার দোকানে লগইন' : 'পাসওয়ার্ড ভুলে গেছেন?'}
      subtitle={mode === 'login' ? 'লগইন করলেই সরাসরি আপনার দোকানের এডমিন প্যানেল খুলবে।' : 'ইমেইল দিন, পাসওয়ার্ড বদলানোর লিংক পাঠানো হবে।'}>
      <form onSubmit={mode === 'login' ? login : sendReset} className="space-y-4">
        <div>
          <label htmlFor="email" className={labelCls}>ইমেইল</label>
          <input id="email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {mode === 'login' && (
          <div>
            <label htmlFor="password" className={labelCls}>পাসওয়ার্ড</label>
            <input id="password" type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
        )}
        {info && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{info}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? 'অপেক্ষা করুন…' : mode === 'login' ? 'লগইন' : 'লিংক পাঠান'}
        </button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <button type="button" className="font-semibold text-[#3a3fd4]" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(''); setInfo(''); }}>
            {mode === 'login' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'লগইনে ফিরে যান'}
          </button>
          <a href="/merchant/signup" className="font-semibold text-[#3a3fd4]">ফ্রি একাউন্ট খুলুন</a>
        </div>
      </form>
    </MerchantShell>
  );
}
