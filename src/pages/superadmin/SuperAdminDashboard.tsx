import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Store, Copy, LogOut, RefreshCw, CheckCircle2, XCircle, Settings2, Trash2, Search } from 'lucide-react';
import { filterStores } from '../../lib/storeSearch';
import { PlanBadge, PlanActions, PlatformSettingsCard, LandingSettingsCard, SmsSettingsCard, SuperCreateStoreForm, type PlanInfo } from '../../components/superadmin/PlatformControls';
import { AiSuperCard } from '../../components/superadmin/AiSuperCard';
import { SmsCreditsCard } from '../../components/superadmin/SmsCreditsCard';

interface StoreRow extends PlanInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  admin_email: string | null;
  created_at: string;
}


const TABS: ['stores' | 'new' | 'plan' | 'sms' | 'ai' | 'landing', string][] = [
  ['stores', 'সব দোকান'], ['new', 'নতুন দোকান'], ['plan', 'সাইন আপ ও প্ল্যান'], ['sms', 'SMS'], ['ai', 'AI'], ['landing', 'ল্যান্ডিং পেজ'],
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const filteredStores: StoreRow[] = filterStores<StoreRow>(stores, search);
  const [tab, setTab] = useState<'stores' | 'new' | 'plan' | 'sms' | 'ai' | 'landing'>('stores');
  const pendingCount = stores.filter((s) => s.status === 'pending').length;


  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Manage existing store (details + change owner login)
  const [openId, setOpenId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ id: string; email: string; password: string } | null>(null);

  const openManage = (store: StoreRow) => {
    if (openId === store.id) { setOpenId(null); return; }
    setOpenId(store.id);
    setEditName(store.name);
    setEditEmail(store.admin_email || '');
    setEditPassword('');
  };

  const storeInfoText = (store: StoreRow, email: string, password?: string) => {
    const o = window.location.origin;
    return `🛍️ আপনার স্টোরের তথ্য\n\nস্টোরের নাম: ${store.name}\nস্টোর লিংক: ${o}/?store=${store.slug}\n\nলগইন লিংক: ${o}/merchant/login\nইমেইল: ${email}` + (password ? `\nপাসওয়ার্ড: ${password}` : '');
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('কপি হয়েছে!'))
      .catch(() => toast.error('কপি করা যায়নি, নিজে লিখে নিন।'));
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDeleteStore = async (store: StoreRow) => {
    const typed = window.prompt(`সাবধান! "${store.name}" দোকানের সব পণ্য, অর্ডার, সেটিংস আর মালিকের একাউন্ট চিরতরে মুছে যাবে, আর ফেরত আনা যাবে না।\n\nনিশ্চিত হলে নিচে লিখুন: ${store.slug}`);
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== store.slug) { toast.error('লেখা মেলেনি, মুছা হয়নি।'); return; }
    setDeletingId(store.id);
    try {
      const { error } = await supabase.rpc('super_delete_store', { p_store_id: store.id });
      if (error) throw error;
      toast.success('দোকান চিরতরে মুছে ফেলা হয়েছে।');
      setOpenId(null);
      await loadStores();
    } catch (err: any) {
      toast.error(err?.message || 'মুছা যায়নি।');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveStore = async (store: StoreRow) => {
    if (saving) return;
    if (editPassword && editPassword.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর দিন।');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('super_update_store', {
        p_store_id: store.id,
        p_store_name: editName.trim(),
        p_admin_email: editEmail.trim(),
        p_new_password: editPassword || null,
      });
      if (error) throw error;
      setLastSaved({ id: store.id, email: editEmail.trim().toLowerCase(), password: editPassword });
      setEditPassword('');
      toast.success('সেভ হয়েছে!');
      await loadStores();
    } catch (err: any) {
      toast.error(err?.message || 'সেভ করা যায়নি।');
    } finally {
      setSaving(false);
    }
  };

  const loadStores = useCallback(async () => {
    // Owner contact details are private, so the full list comes from a super-admin-only function
    const { data, error } = await supabase.rpc('super_list_stores');
    if (error) {
      toast.error('স্টোর তালিকা আনা যায়নি: ' + error.message);
      return;
    }
    setStores((data as StoreRow[]) || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/super-admin/login');
        return;
      }
      const { data: sa } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!sa) {
        await supabase.auth.signOut();
        navigate('/super-admin/login');
        return;
      }
      setAuthorized(true);
      await loadStores();
      setLoading(false);
    })();
  }, [navigate, loadStores]);



  const handleToggle = async (store: StoreRow) => {
    setTogglingId(store.id);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: !store.is_active })
        .eq('id', store.id);
      if (error) throw error;
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, is_active: !s.is_active } : s))
      );
      toast.success(store.is_active ? 'স্টোর বন্ধ করা হয়েছে' : 'স্টোর চালু করা হয়েছে');
    } catch (err: any) {
      toast.error(err?.message || 'পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setTogglingId(null);
    }
  };


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/super-admin/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStores();
    setRefreshing(false);
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Store className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">সুপার অ্যাডমিন</h1>
              <p className="text-[11px] text-slate-400 leading-tight">মাল্টি-স্টোর কন্ট্রোল</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            লগ আউট
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <nav aria-label="সুপার এডমিন অংশ" className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold border transition-colors ${tab === key ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                {label}{key === 'stores' && pendingCount > 0 && <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[11px] text-slate-950">{pendingCount}</span>}
              </button>
            ))}
          </div>
        </nav>

        {tab === 'stores' && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-400" />
              সব স্টোর ({stores.length})
            </h2>
            <button
              onClick={handleRefresh}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="রিফ্রেশ"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="search"
              aria-label="স্টোর খুঁজুন"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="নাম, ইমেইল বা লিংকের নাম"
              className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {search.trim() && (
            <p role="status" aria-live="polite" className="mb-3 text-sm text-slate-400">
              {filteredStores.length}টি স্টোর পাওয়া গেছে
            </p>
          )}
          {stores.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">এখনো কোনো স্টোর নেই।</p>
          ) : filteredStores.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">কোনো স্টোর পাওয়া যায়নি।</p>
          ) : (
            <div className="space-y-3">
              {filteredStores.map((store) => (
                <div key={store.id} className="rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{store.name}</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{store.slug}</p>
                    {store.admin_email && (
                      <p className="text-xs text-slate-500 truncate">{store.admin_email}</p>
                    )}
                    <div className="mt-1"><PlanBadge s={store} /></div>
                    <p className="text-[11px] mt-1 flex items-center gap-1">
                      {store.is_active ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> চালু আছে
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" /> বন্ধ আছে
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(store)}
                    disabled={togglingId === store.id}
                    className={`shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      store.is_active ? 'bg-emerald-500' : 'bg-slate-600'
                    } ${togglingId === store.id ? 'opacity-50' : ''}`}
                    aria-label={store.is_active ? 'স্টোর বন্ধ করুন' : 'স্টোর চালু করুন'}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        store.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="px-4 pb-4">
                  <button
                    onClick={() => openManage(store)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-400"
                  >
                    <Settings2 className="h-4 w-4" />
                    {openId === store.id ? 'বন্ধ করুন' : 'বিস্তারিত / পরিবর্তন'}
                  </button>
                  {openId === store.id && (
                    <div className="mt-3 space-y-3">
                      <div className="text-xs text-slate-300 space-y-1 font-mono break-all bg-slate-900 rounded-lg p-3">
                        <p>স্টোর লিংক: {window.location.origin}/?store={store.slug}</p>
                        <p>লগইন: {window.location.origin}/merchant/login</p>
                        <p>ইমেইল: {store.admin_email || '—'}</p>
                        <p>
                          পাসওয়ার্ড:{' '}
                          {lastSaved?.id === store.id && lastSaved.password
                            ? lastSaved.password
                            : 'লুকানো (নিরাপত্তার জন্য দেখা যায় না — নিচে নতুন পাসওয়ার্ড দিন)'}
                        </p>
                      </div>
                      <PlanActions storeId={store.id} s={store} onDone={loadStores} />
                      <button
                        onClick={() => copyText(storeInfoText(store, store.admin_email || '', lastSaved?.id === store.id ? lastSaved.password : undefined))}
                        className="flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2"
                      >
                        <Copy className="h-4 w-4" /> তথ্য কপি করুন
                      </button>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">স্টোরের নাম</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">মালিকের লগইন ইমেইল</label>
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">নতুন পাসওয়ার্ড (না বদলাতে চাইলে খালি রাখুন)</label>
                        <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="কমপক্ষে ৬ অক্ষর"
                          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
                      </div>
                      <button
                        onClick={() => handleSaveStore(store)}
                        disabled={saving}
                        className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-sm"
                      >
                        {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store)}
                        disabled={deletingId === store.id}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/10 disabled:opacity-50 font-bold py-2.5 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === store.id ? 'মুছা হচ্ছে...' : 'দোকান চিরতরে মুছে ফেলুন'}
                      </button>
                    </div>
                  )}
                </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}
        {tab === 'new' && <SuperCreateStoreForm onCreated={() => { loadStores(); }} />}
        {tab === 'plan' && <PlatformSettingsCard />}
        {tab === 'sms' && <><SmsSettingsCard /><SmsCreditsCard stores={stores} /></>}
        {tab === 'ai' && <AiSuperCard stores={stores} />}
        {tab === 'landing' && <LandingSettingsCard />}
      </main>
    </div>
  );
}
