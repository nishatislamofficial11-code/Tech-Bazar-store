import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Store, Plus, Copy, LogOut, RefreshCw, CheckCircle2, XCircle, Settings2 } from 'lucide-react';

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  admin_email: string | null;
  created_at: string;
}

interface CreatedCredentials {
  storeName: string;
  slug: string;
  email: string;
  password: string;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedCredentials | null>(null);

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
    return `🛍️ আপনার স্টোরের তথ্য\n\nস্টোরের নাম: ${store.name}\nস্টোর লিংক: ${o}/?store=${store.slug}\n\nলগইন লিংক: ${o}/signin?store=${store.slug}\nইমেইল: ${email}` + (password ? `\nপাসওয়ার্ড: ${password}` : '');
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('কপি হয়েছে!'))
      .catch(() => toast.error('কপি করা যায়নি, নিজে লিখে নিন।'));
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
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, is_active, admin_email, created_at')
      .order('created_at', { ascending: false });
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

  const handleNameChange = (value: string) => {
    setStoreName(value);
    setSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (!slug) {
      toast.error('স্টোরের নামে ইংরেজি অক্ষর রাখুন যাতে লিংক বানানো যায়।');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.rpc('create_store_with_admin', {
        p_store_name: storeName.trim(),
        p_slug: slug,
        p_admin_email: adminEmail.trim(),
        p_admin_password: adminPassword,
      });
      if (error) throw error;

      setCreated({
        storeName: storeName.trim(),
        slug,
        email: adminEmail.trim(),
        password: adminPassword,
      });
      setStoreName('');
      setSlug('');
      setAdminEmail('');
      setAdminPassword('');
      toast.success('নতুন স্টোর তৈরি হয়েছে!');
      await loadStores();
    } catch (err: any) {
      toast.error(err?.message || 'স্টোর তৈরি ব্যর্থ হয়েছে।');
    } finally {
      setCreating(false);
    }
  };

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

  const copyCredentials = () => {
    if (!created) return;
    const storeUrl = `${window.location.origin}/?store=${created.slug}`;
    const loginUrl = `${window.location.origin}/signin?store=${created.slug}`;
    const text = `🛍️ আপনার নতুন স্টোর প্রস্তুত!\n\nস্টোরের নাম: ${created.storeName}\nস্টোর লিংক: ${storeUrl}\n\nলগইন লিংক: ${loginUrl}\nইমেইল: ${created.email}\nপাসওয়ার্ড: ${created.password}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('কপি হয়েছে! এখন কাস্টমারকে পাঠিয়ে দিন।'))
      .catch(() => toast.error('কপি করা যায়নি, নিজে লিখে নিন।'));
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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-base font-bold flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-emerald-400" />
            নতুন স্টোর তৈরি করুন
          </h2>
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">স্টোরের নাম</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="যেমন: Rahman Electronics"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {slug && (
                <p className="text-xs text-emerald-400 mt-1.5">
                  স্টোর লিংক হবে: <span className="font-mono">{window.location.origin}/?store={slug}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">স্টোর মালিকের ইমেইল</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">লগইন পাসওয়ার্ড</label>
              <input
                type="text"
                required
                minLength={6}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষর"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3 transition-colors"
            >
              {creating ? 'তৈরি হচ্ছে...' : 'স্টোর তৈরি করুন'}
            </button>
          </form>

          {created && (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-sm font-bold text-emerald-300 mb-2">
                ✅ স্টোর তৈরি হয়েছে! এই তথ্যগুলো কাস্টমারকে পাঠিয়ে দিন:
              </p>
              <div className="text-sm text-slate-200 space-y-1 font-mono break-all">
                <p>স্টোর: {created.storeName}</p>
                <p>স্টোর লিংক: {window.location.origin}/?store={created.slug}</p>
                <p>লগইন: {window.location.origin}/signin?store={created.slug}</p>
                <p>ইমেইল: {created.email}</p>
                <p>পাসওয়ার্ড: {created.password}</p>
              </div>
              <button
                onClick={copyCredentials}
                className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold px-4 py-2.5 transition-colors"
              >
                <Copy className="h-4 w-4" />
                সব কপি করুন
              </button>
            </div>
          )}
        </section>

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

          {stores.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">এখনো কোনো স্টোর নেই।</p>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
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
                        <p>লগইন: {window.location.origin}/signin?store={store.slug}</p>
                        <p>ইমেইল: {store.admin_email || '—'}</p>
                        <p>
                          পাসওয়ার্ড:{' '}
                          {lastSaved?.id === store.id && lastSaved.password
                            ? lastSaved.password
                            : 'লুকানো (নিরাপত্তার জন্য দেখা যায় না — নিচে নতুন পাসওয়ার্ড দিন)'}
                        </p>
                      </div>
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
                    </div>
                  )}
                </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
