import { useEffect, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface AppliedCoupon { code: string; discount: number }

async function checkCoupon(code: string, subtotal: number): Promise<{ ok: boolean; discount?: number; code?: string; message?: string }> {
  const { data, error } = await supabase.rpc('check_coupon', { p_code: code, p_subtotal: subtotal });
  if (error) return { ok: false, message: 'কুপন যাচাই করা যায়নি, আবার চেষ্টা করুন' };
  return data as { ok: boolean; discount?: number; code?: string; message?: string };
}

/** Coupon code box for checkout. The server checks the code again when the order is placed. */
export function CouponBox({ subtotal, value, onChange }: { subtotal: number; value: AppliedCoupon | null; onChange: (c: AppliedCoupon | null) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The discount depends on the cart, so check again when the cart changes
  useEffect(() => {
    if (!value) return;
    let stale = false;
    checkCoupon(value.code, subtotal).then((r) => {
      if (stale) return;
      if (!r.ok) { onChange(null); setError(r.message || 'কুপন আর প্রযোজ্য নয়'); setOpen(true); }
      else if (Number(r.discount) !== value.discount) onChange({ code: value.code, discount: Number(r.discount) });
    });
    return () => { stale = true; };
  }, [subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    setError('');
    const r = await checkCoupon(c, subtotal);
    setBusy(false);
    if (!r.ok) { setError(r.message || 'এই কুপন কোড সঠিক নয়'); return; }
    onChange({ code: r.code || c, discount: Number(r.discount) || 0 });
    setCode('');
    setOpen(false);
  };

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 text-emerald-700 font-semibold"><Tag className="h-4 w-4" />{value.code} — ৳{value.discount.toFixed(2)} ছাড়</span>
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded-full hover:bg-emerald-100" aria-label="কুপন সরান"><X className="h-4 w-4 text-emerald-700" /></button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <Tag className="h-4 w-4" />কুপন কোড আছে?
      </button>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} maxLength={30}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
          placeholder="কুপন কোড" aria-label="কুপন কোড"
          className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:border-primary" />
        <button type="button" onClick={apply} disabled={busy || !code.trim()} className="rounded-xl bg-slate-900 text-white text-sm font-bold px-4 disabled:opacity-50">
          {busy ? '...' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
