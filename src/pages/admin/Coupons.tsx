import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  value: number;
  min_order: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}
type Draft = Partial<Coupon> & { id?: string };

const toDateInput = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) : '');
const fromDateInput = (d: string, endOfDay: boolean) => (d ? new Date(`${d}T${endOfDay ? '23:59:59' : '00:00:00'}+06:00`).toISOString() : null);
const fmt = (n: number) => `৳${Number(n).toLocaleString('en-US')}`;

function status(c: Coupon) {
  const now = Date.now();
  if (!c.is_active) return { label: 'বন্ধ', cls: 'bg-gray-100 text-gray-500' };
  if (c.ends_at && now > Date.parse(c.ends_at)) return { label: 'মেয়াদ শেষ', cls: 'bg-red-50 text-red-600' };
  if (c.starts_at && now < Date.parse(c.starts_at)) return { label: 'শুরু হয়নি', cls: 'bg-amber-50 text-amber-700' };
  if (c.usage_limit && c.used_count >= c.usage_limit) return { label: 'লিমিট শেষ', cls: 'bg-red-50 text-red-600' };
  return { label: 'চালু', cls: 'bg-emerald-50 text-emerald-700' };
}

export default function AdminCoupons() {
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setList((data || []) as Coupon[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!edit) return;
    const code = String(edit.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return toast.error('কোড ৩-৩০ অক্ষরের হবে: ইংরেজি অক্ষর, সংখ্যা, - বা _');
    const value = Number(edit.value);
    if (!(value > 0)) return toast.error('ছাড়ের পরিমাণ দিন');
    if (edit.discount_type === 'percent' && value > 100) return toast.error('শতাংশ ১০০-এর বেশি হতে পারে না');
    const row = {
      code,
      discount_type: edit.discount_type || 'percent',
      value,
      min_order: Number(edit.min_order) || 0,
      max_discount: edit.discount_type === 'percent' && Number(edit.max_discount) > 0 ? Number(edit.max_discount) : null,
      starts_at: edit.starts_at ?? null,
      ends_at: edit.ends_at ?? null,
      usage_limit: Number(edit.usage_limit) > 0 ? Math.floor(Number(edit.usage_limit)) : null,
      is_active: edit.is_active ?? true,
    };
    setSaving(true);
    const { error } = edit.id
      ? await supabase.from('coupons').update(row).eq('id', edit.id)
      : await supabase.from('coupons').insert(row);
    setSaving(false);
    if (error) return toast.error(error.code === '23505' ? 'এই কোড আগেই আছে' : error.message);
    toast.success('সেভ হয়েছে');
    setEdit(null);
    load();
  };

  const toggle = async (c: Coupon) => {
    const { error } = await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) return toast.error(error.message);
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`কুপন ${c.code} মুছে ফেলবেন?`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', c.id);
    if (error) return toast.error(error.message);
    setList((l) => l.filter((x) => x.id !== c.id));
  };

  const input = 'mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal focus:outline-none focus:border-primary';

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500">ডিসকাউন্ট কোড বানান। কাস্টমার চেকআউটে কোড দিলে প্রোডাক্টের দামের ওপর ছাড় পাবে (ডেলিভারি চার্জে না)।</p>
        </div>
        <button onClick={() => setEdit({ discount_type: 'percent', is_active: true })} className="shrink-0 flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl">
          <Plus className="h-4 w-4" />নতুন কুপন
        </button>
      </div>

      {loading ? <p className="text-center text-sm text-gray-400 py-10">লোড হচ্ছে…</p> : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Tag className="h-10 w-10 mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">এখনো কোনো কুপন নেই। যেমন <b>EID20</b> — ২০% ছাড়, বা <b>WELCOME100</b> — ৳১০০ ছাড়।</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => {
            const st = status(c);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 tracking-wide">{c.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {c.discount_type === 'percent' ? `${c.value}% ছাড়` : `${fmt(c.value)} ছাড়`}
                    {c.max_discount ? ` (সর্বোচ্চ ${fmt(c.max_discount)})` : ''}
                    {c.min_order > 0 ? ` · কমপক্ষে ${fmt(c.min_order)}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ব্যবহার {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}
                    {c.ends_at ? ` · শেষ ${toDateInput(c.ends_at)}` : ''}
                  </p>
                </div>
                <button onClick={() => toggle(c)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? 'চালু' : 'বন্ধ'}</button>
                <button onClick={() => setEdit(c)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="এডিট"><Pencil className="h-4 w-4 text-gray-500" /></button>
                <button onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-red-50" aria-label="মুছুন"><Trash2 className="h-4 w-4 text-red-500" /></button>
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setEdit(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{edit.id ? 'কুপন এডিট' : 'নতুন কুপন'}</h2>
              <button onClick={() => setEdit(null)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="বন্ধ"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs font-bold text-gray-600">কুপন কোড
              <input value={edit.code || ''} maxLength={30} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="EID20" className={`${input} font-mono uppercase`} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-gray-600">ছাড়ের ধরন
                <select value={edit.discount_type || 'percent'} onChange={(e) => setEdit({ ...edit, discount_type: e.target.value as Coupon['discount_type'] })} className={input}>
                  <option value="percent">শতাংশ (%)</option>
                  <option value="fixed">নির্দিষ্ট টাকা (৳)</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-gray-600">{edit.discount_type === 'fixed' ? 'কত টাকা' : 'কত শতাংশ'}
                <input type="number" min={0} value={edit.value ?? ''} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} className={input} />
              </label>
              <label className="block text-xs font-bold text-gray-600">সর্বনিম্ন কেনাকাটা (৳)
                <input type="number" min={0} value={edit.min_order ?? ''} onChange={(e) => setEdit({ ...edit, min_order: Number(e.target.value) })} placeholder="0" className={input} />
              </label>
              {edit.discount_type !== 'fixed' && (
                <label className="block text-xs font-bold text-gray-600">সর্বোচ্চ ছাড় (৳)
                  <input type="number" min={0} value={edit.max_discount ?? ''} onChange={(e) => setEdit({ ...edit, max_discount: e.target.value ? Number(e.target.value) : null })} placeholder="সীমা নেই" className={input} />
                </label>
              )}
              <label className="block text-xs font-bold text-gray-600">শুরু
                <input type="date" value={toDateInput(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: fromDateInput(e.target.value, false) })} className={input} />
              </label>
              <label className="block text-xs font-bold text-gray-600">শেষ
                <input type="date" value={toDateInput(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: fromDateInput(e.target.value, true) })} className={input} />
              </label>
              <label className="block text-xs font-bold text-gray-600 col-span-2">মোট কতবার ব্যবহার করা যাবে
                <input type="number" min={0} value={edit.usage_limit ?? ''} onChange={(e) => setEdit({ ...edit, usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="সীমা নেই" className={input} />
              </label>
            </div>
            <button onClick={save} disabled={saving} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl disabled:opacity-50">{saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
