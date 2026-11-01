import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { rawSupabase } from '../lib/supabase';
import { currentStoreSlug } from '../lib/currentStore';

// Shows a "closed" message when the current store is turned off by the super admin.
export function StoreGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [state, setState] = useState<'ok' | 'closed' | 'missing'>('ok');

  useEffect(() => {
    if (!currentStoreSlug) return;
    rawSupabase.rpc('get_store_status', { p_slug: currentStoreSlug }).then(({ data, error }) => {
      if (error) return;
      if (data === 'missing') setState('missing');
      else if (data === 'inactive') setState('closed');
    });
  }, []);

  if (pathname.startsWith('/super-admin') || state === 'ok') return <>{children}</>;
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">
          {state === 'closed' ? 'এই স্টোরটি এখন বন্ধ আছে' : 'স্টোর পাওয়া যায়নি'}
        </h1>
        <p className="opacity-70">Store is currently unavailable.</p>
      </div>
    </div>
  );
}
