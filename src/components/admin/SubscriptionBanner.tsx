import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyStore, daysLeft, bn, type MyStore } from '../../lib/platform';

// Shown at the top of the admin panel: trial days left, or "store closed — pay to reopen".
export function useMyStore() {
  const [store, setStore] = useState<MyStore | null>(null);
  useEffect(() => { getMyStore().then(setStore).catch(() => setStore(null)); }, []);
  return store;
}

export default function SubscriptionBanner({ store }: { store: MyStore | null }) {
  if (!store) return null;
  const pay = <Link to="/admin/billing" className="shrink-0 rounded-full bg-white/95 px-4 py-1.5 text-sm font-bold text-slate-900 hover:bg-white">পেমেন্ট করুন</Link>;

  if (store.status === 'pending') {
    return <div role="status" className="bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white">আপনার দোকান অনুমোদনের অপেক্ষায় আছে। অনুমোদনের আগে ক্রেতারা দোকান দেখতে পাবে না।</div>;
  }
  if (!store.open) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white">
        <span>আপনার দোকান এখন ক্রেতাদের জন্য বন্ধ আছে। আবার চালু করতে পেমেন্ট করুন। আপনার সব অর্ডার আর পণ্য নিরাপদ আছে।</span>
        {pay}
      </div>
    );
  }
  const left = store.status === 'trial' ? daysLeft(store.trial_ends_at) : daysLeft(store.paid_until);
  if (left === null) return null; // no end date (e.g. stores set up by the super admin)
  if (store.status === 'trial') {
    const urgent = left <= 5;
    return (
      <div role="status" className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-white ${urgent ? 'bg-[#ff8a3d]' : 'bg-[#3a3fd4]'}`}>
        <span>ফ্রি ট্রায়াল: আর {bn(Math.max(left, 0))} দিন বাকি{urgent ? '। দোকান চালু রাখতে আগেই পেমেন্ট করে নিন।' : ''}</span>
        {urgent ? pay : <Link to="/admin/billing" className="shrink-0 underline underline-offset-2">বিস্তারিত</Link>}
      </div>
    );
  }
  if (left <= 5) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 bg-[#ff8a3d] px-4 py-2.5 text-sm font-semibold text-white">
        <span>আপনার প্ল্যানের মেয়াদ আর {bn(Math.max(left, 0))} দিন বাকি।</span>
        {pay}
      </div>
    );
  }
  return null;
}
