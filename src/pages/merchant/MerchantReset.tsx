import React, { useState } from 'react';
import { rawSupabase } from '../../lib/supabase';
import MerchantShell, { inputCls, labelCls, primaryBtn } from './MerchantShell';

// Opened from the password-reset email (Supabase signs the user in for this one step)
export default function MerchantReset() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।'); return; }
    setBusy(true); setError('');
    const { error: err } = await rawSupabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(/session/i.test(err.message) ? 'লিংকের মেয়াদ শেষ। আবার পাসওয়ার্ড রিসেটের লিংক নিন।' : err.message);
    else { setDone(true); await rawSupabase.auth.signOut(); }
  };

  return (
    <MerchantShell title="নতুন পাসওয়ার্ড দিন">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">পাসওয়ার্ড বদলানো হয়েছে।</p>
          <a href="/merchant/login" className={primaryBtn}>লগইন করুন</a>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="password" className={labelCls}>নতুন পাসওয়ার্ড</label>
            <input id="password" type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="কমপক্ষে ৮ অক্ষর" required />
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'সেভ হচ্ছে…' : 'পাসওয়ার্ড সেভ করুন'}</button>
        </form>
      )}
    </MerchantShell>
  );
}
