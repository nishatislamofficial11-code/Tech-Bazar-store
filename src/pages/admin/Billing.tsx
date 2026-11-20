import React, { useEffect, useState } from 'react';
import { CreditCard, CalendarClock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getMyStore, daysLeft, bn, bnDate, type MyStore } from '../../lib/platform';

const statusText: Record<string, string> = {
  pending: 'অনুমোদনের অপেক্ষায়', trial: 'ফ্রি ট্রায়াল', active: 'চালু (পেইড)',
  expired: 'মেয়াদ শেষ', suspended: 'সাময়িক বন্ধ', rejected: 'অনুমোদন হয়নি',
};

export default function Billing() {
  const [store, setStore] = useState<MyStore | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getMyStore().then(setStore).catch(() => setStore(null)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="p-6 text-slate-500">লোড হচ্ছে…</div>;
  if (!store) return <div className="p-6 text-slate-500">এই একাউন্টের সাথে কোনো দোকানের প্ল্যান যুক্ত নেই।</div>;

  const end = store.status === 'trial' ? store.trial_ends_at : store.paid_until;
  const left = daysLeft(end);
  const price = store.plan_price?.trim();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">বিলিং ও প্ল্যান</h1>
        <p className="mt-1 text-slate-500">আপনার Cloud Commerce প্ল্যানের অবস্থা আর পেমেন্ট।</p>
      </div>

      <section className="rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">বর্তমান প্ল্যান</p>
            <p className="text-xl font-bold text-slate-900">{store.plan_name || 'Cloud Commerce'}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${store.open ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {store.open ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {store.open ? statusText[store.status] || store.status : 'দোকান বন্ধ'}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="flex items-center gap-2 text-sm text-slate-500"><CalendarClock className="h-4 w-4" />মেয়াদ</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {end ? <>{bnDate(end)}{left !== null && left >= 0 && <span className="text-slate-500"> ({bn(left)} দিন বাকি)</span>}</> : 'কোনো শেষ তারিখ নেই'}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="flex items-center gap-2 text-sm text-slate-500"><CreditCard className="h-4 w-4" />মাসিক ফি</dt>
            <dd className="mt-1 font-semibold text-slate-900">{price ? `৳${bn(price)} / মাস` : 'শীঘ্রই জানানো হবে'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-900">পেমেন্ট করুন</h2>
        <p className="mt-1 text-slate-500">অনলাইনে bKash, Nagad বা কার্ড দিয়ে পেমেন্ট শীঘ্রই চালু হবে। পেমেন্ট হলেই দোকান নিজে থেকে আরও ৩০ দিনের জন্য চালু হয়ে যাবে।</p>
        <button type="button" disabled className="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-[#3a3fd4] px-6 py-3 font-bold text-white opacity-50">
          <CreditCard className="h-5 w-5" /> অনলাইনে পেমেন্ট (শীঘ্রই)
        </button>
        <p className="mt-4 text-sm text-slate-500">এর মধ্যে পেমেন্ট করতে Cloud Commerce সাপোর্টে যোগাযোগ করুন। পেমেন্ট নিশ্চিত হলে আমরা আপনার দোকান চালু করে দেব।</p>
      </section>
    </div>
  );
}
