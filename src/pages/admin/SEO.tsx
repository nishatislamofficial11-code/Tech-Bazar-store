import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Search, Globe, ShieldCheck, RefreshCw, FileText, ExternalLink, 
  Copy, Check, Save, Smartphone, Monitor, Share2, 
  Info, CheckCircle, AlertCircle, Sparkles, Layers, CheckCircle2
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useSettings } from '../../contexts/SettingsContext';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';

type TabType = 'meta' | 'social' | 'sitemaps' | 'verification';

export default function AdminSEO() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState(false);
  const { refreshSettings } = useSettings();

  const [activeTab, setActiveTab] = useState<TabType>('meta');
  const [serpDevice, setSerpDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [socialPlatform, setSocialPlatform] = useState<'facebook' | 'whatsapp'>('facebook');
  
  const [settings, setSettings] = useState({
    siteName: '',
    siteDescription: '',
    siteKeywords: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterHandle: '',
    siteUrl: typeof window !== 'undefined' ? window.location.origin : '',
    google_site_verification: '',
    bing_site_verification: '',
    fb_domain_verification: '',
  });

  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    pages: 0,
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchSettingsAndStats();
  }, []);

  const fetchSettingsAndStats = async () => {
    try {
      setLoading(true);
      const [settingsRes, prodCountRes, catCountRes, pageCountRes] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('pages').select('id', { count: 'exact', head: true })
      ]);

      if (settingsRes.error) {
        if (settingsRes.error.code === '42P01' || settingsRes.error.message.includes('schema cache')) {
          setDbError(true);
        } else {
          toast.error(`Failed to load settings: ${settingsRes.error.message}`);
        }
      } else if (settingsRes.data) {
        const newSettings = { ...settings };
        settingsRes.data.forEach((item) => {
          if (item.key in newSettings) {
            (newSettings as any)[item.key] = item.value;
          }
        });
        setSettings(newSettings);
      }

      setStats({
        products: prodCountRes.count || 0,
        categories: catCountRes.count || 0,
        pages: pageCountRes.count || 0,
      });

    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    
    try {
      const settingsToSave = { ...settings };
      const entries = Object.entries(settingsToSave);
      
      for (const [key, value] of entries) {
        const { data: existing } = await supabase.from('settings').select('id').eq('key', key).maybeSingle();
        
        if (existing) {
          await supabase.from('settings').update({ value: String(value ?? '') }).eq('key', key);
        } else {
          await supabase.from('settings').insert([{ key, value: String(value ?? '') }]);
        }
      }
      
      setSettings(settingsToSave);
      toast.success('SEO settings saved successfully');
      await refreshSettings();
    } catch (err: any) {
      toast.error(`Failed to save settings: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const liveSitemapUrl = typeof window !== 'undefined' ? `${window.location.origin}/sitemap.xml` : '/sitemap.xml';
  const liveRobotsUrl = typeof window !== 'undefined' ? `${window.location.origin}/robots.txt` : '/robots.txt';
  const totalUrlsCount = stats.products + stats.categories + stats.pages + 3;

  const siteDomain = typeof window !== 'undefined' ? window.location.hostname : 'yourshop.com';
  const previewTitle = settings.siteName || 'Store - Online Shopping in Bangladesh';
  const previewDesc = settings.siteDescription || 'Discover premium collections, authentic products at best prices with fast home delivery and cash on delivery across Bangladesh.';

  // Title & description length evaluation
  const titleLen = settings.siteName.trim().length;
  const descLen = settings.siteDescription.trim().length;

  const tabs: { id: TabType; label: string; count?: number | string }[] = [
    { id: 'meta', label: 'Search Engine Listing' },
    { id: 'social', label: 'Social Sharing (Open Graph)' },
    { id: 'sitemaps', label: 'Sitemaps & Robots.txt', count: `${totalUrlsCount} URLs` },
    { id: 'verification', label: 'Webmaster Verification' },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16 px-4 sm:px-6 font-sans">
      
      {/* 1. Header Section */}
      <div className="pt-2 pb-6 border-b border-slate-200/90 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Admin</span>
            <span>/</span>
            <span>Settings</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">SEO</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Search Engine Optimization (SEO)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure how search engines and social media networks index and display your store.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchSettingsAndStats}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-xs transition"
            title="Refresh SEO Settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-900' : ''}`} />
          </button>
          
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Search Console</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {dbError ? (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-amber-800 mb-1">Database Setup Required</h3>
          <p className="text-xs text-amber-700">The settings table could not be reached in Supabase.</p>
        </div>
      ) : loading ? (
        <div className="py-20 text-center">
          <LoadingSpinner fullScreen={false} message="Loading SEO configuration..." />
        </div>
      ) : (
        <div className="space-y-6">

          {/* 2. Professional Tab Navigation (Shopify Style) */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-1 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-2 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'border-slate-900 text-slate-900 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <form onSubmit={handleSave} className="space-y-6">

            {/* TAB 1: SEARCH ENGINE LISTING & GOOGLE SERP PREVIEW */}
            {activeTab === 'meta' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left: Input Form (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Search engine listing</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Configure how your homepage appears in organic Google search results.
                        </p>
                      </div>
                    </div>

                    <div className="p-6 space-y-5">
                      
                      {/* Meta Title */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-slate-800">
                            Homepage title <span className="text-red-500">*</span>
                          </label>
                          <span className={`text-[11px] font-mono font-medium ${
                            titleLen > 60 
                              ? 'text-amber-600 font-bold' 
                              : titleLen >= 40 
                              ? 'text-emerald-600 font-bold' 
                              : 'text-slate-400'
                          }`}>
                            {titleLen} of 60 characters used
                          </span>
                        </div>
                        <input
                          type="text"
                          value={settings.siteName}
                          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                          placeholder="e.g. Niyo Shop - Authentic Electronics & Lifestyle Store in BD"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                          Keep your title between 40 and 60 characters so Google does not cut it off. Include your brand name and primary product keywords.
                        </p>
                      </div>

                      {/* Meta Description */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-semibold text-slate-800">
                            Homepage meta description
                          </label>
                          <span className={`text-[11px] font-mono font-medium ${
                            descLen > 160 
                              ? 'text-amber-600 font-bold' 
                              : descLen >= 120 
                              ? 'text-emerald-600 font-bold' 
                              : 'text-slate-400'
                          }`}>
                            {descLen} of 160 characters used
                          </span>
                        </div>
                        <textarea
                          value={settings.siteDescription}
                          onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                          rows={3}
                          placeholder="Brief summary of your store shown under the title on Google..."
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs leading-relaxed font-normal"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                          Recommended length: 120 to 160 characters. Clearly state what you sell, fast shipping, and cash on delivery availability.
                        </p>
                      </div>

                      {/* Target Keywords */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                          Focus keywords (Meta Keywords)
                        </label>
                        <input
                          type="text"
                          value={settings.siteKeywords}
                          onChange={(e) => setSettings({ ...settings, siteKeywords: e.target.value })}
                          placeholder="e.g. online shopping bd, kitchen tools, fast delivery, authentic electronics"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Comma-separated keywords representing your core store categories and offerings.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* SEO Health Tips Card */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                      Best Practices for Bangladesh eCommerce
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Include <strong>"in Bangladesh"</strong> or <strong>"Online BD"</strong> in your title to capture targeted local organic traffic.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Mention <strong>Cash on Delivery (COD)</strong> and <strong>Fast Home Delivery</strong> in your meta description to increase click-through rates.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Ensure your product names are descriptive with brand, size, and model numbers for automated product indexing.</span>
                      </li>
                    </ul>
                  </div>

                </div>

                {/* Right: Authentic Google SERP Preview (5 cols) */}
                <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    
                    {/* Preview Header */}
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span className="text-xs font-bold text-slate-800">Google Search Preview</span>
                      </div>

                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setSerpDevice('desktop')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                            serpDevice === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Monitor className="w-3 h-3" /> Desktop
                        </button>
                        <button
                          type="button"
                          onClick={() => setSerpDevice('mobile')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                            serpDevice === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Smartphone className="w-3 h-3" /> Mobile
                        </button>
                      </div>
                    </div>

                    {/* Google SERP Card Rendering */}
                    <div className="p-5 bg-white space-y-2.5">
                      
                      {/* URL Breadcrumb */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                          {siteDomain.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-slate-800 font-medium text-xs truncate">
                            {settings.siteName ? settings.siteName.split('-')[0].trim() : siteDomain}
                          </span>
                          <span className="text-slate-500 text-[11px] truncate">
                            https://{siteDomain}
                          </span>
                        </div>
                      </div>

                      {/* Google Clickable Blue Title */}
                      <h3 className="text-[#1a0dab] hover:underline text-[17px] leading-snug font-normal cursor-pointer line-clamp-2">
                        {previewTitle}
                      </h3>

                      {/* Snippet Description */}
                      <p className="text-[#4d5156] text-[13px] leading-relaxed line-clamp-3">
                        {previewDesc}
                      </p>

                    </div>

                    {/* Footer Status */}
                    <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Ready for indexing</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">Canonical: auto</span>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: SOCIAL SHARING & OPEN GRAPH (FACEBOOK & WHATSAPP) */}
            {activeTab === 'social' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left: Input Form (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
                      <h2 className="text-sm font-bold text-slate-900">Social sharing preview (Open Graph)</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customize how links to your store look when shared on WhatsApp, Facebook, Telegram, or Twitter.
                      </p>
                    </div>

                    <div className="p-6 space-y-5">
                      
                      {/* Social Title */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                          Social title (og:title)
                        </label>
                        <input
                          type="text"
                          value={settings.ogTitle}
                          onChange={(e) => setSettings({ ...settings, ogTitle: e.target.value })}
                          placeholder="Defaults to homepage title if left blank"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Leave blank to automatically use your Homepage Meta Title.
                        </p>
                      </div>

                      {/* Social Description */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                          Social description (og:description)
                        </label>
                        <textarea
                          value={settings.ogDescription}
                          onChange={(e) => setSettings({ ...settings, ogDescription: e.target.value })}
                          rows={2}
                          placeholder="Defaults to global meta description if left blank"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs leading-relaxed font-normal"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Leave blank to automatically use your Homepage Meta Description.
                        </p>
                      </div>

                      {/* Social Share Image */}
                      <div>
                        <CloudinaryUpload
                          label="Social share image (og:image)"
                          value={settings.ogImage || ''}
                          onChange={(url) => setSettings({ ...settings, ogImage: url })}
                          placeholder="Upload or paste image URL..."
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Recommended resolution: <strong>1200 × 630 pixels</strong> (aspect ratio 1.91:1). This banner appears when someone shares your store URL on Facebook, WhatsApp, or Twitter.
                        </p>
                      </div>

                      {/* Twitter Handle */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                          Twitter / X profile handle (optional)
                        </label>
                        <input
                          type="text"
                          value={settings.twitterHandle}
                          onChange={(e) => setSettings({ ...settings, twitterHandle: e.target.value })}
                          placeholder="@yourbrand"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-mono"
                        />
                      </div>

                    </div>
                  </div>
                </div>

                {/* Right: Social Card Mockup (5 cols) */}
                <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-slate-700" />
                        <span className="text-xs font-bold text-slate-800">Social Card Preview</span>
                      </div>
                      
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setSocialPlatform('facebook')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            socialPlatform === 'facebook' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Facebook
                        </button>
                        <button
                          type="button"
                          onClick={() => setSocialPlatform('whatsapp')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            socialPlatform === 'whatsapp' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          WhatsApp
                        </button>
                      </div>
                    </div>

                    {/* Social Mockup Rendering */}
                    <div className="p-4 bg-slate-50/80">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        {settings.ogImage ? (
                          <img
                            src={settings.ogImage}
                            alt="Social preview"
                            className="w-full h-44 object-cover"
                          />
                        ) : (
                          <div className="w-full h-44 bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                            <Share2 className="w-8 h-8 mb-2 text-slate-300" />
                            <span className="text-xs font-medium text-slate-500">
                              Upload an image to preview card
                            </span>
                          </div>
                        )}
                        <div className="p-3.5 bg-slate-50 border-t border-slate-200/80">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {siteDomain}
                          </div>
                          <div className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">
                            {settings.ogTitle || settings.siteName || 'Store Title'}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {settings.ogDescription || settings.siteDescription || 'Store description shown when sharing link on Facebook and WhatsApp.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px]">Facebook and WhatsApp cache link previews for up to 7 days.</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: SITEMAPS & ROBOTS.TXT (100% CLEAN LIGHT THEME) */}
            {activeTab === 'sitemaps' && (
              <div className="space-y-6">
                
                {/* XML Sitemap Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="p-6 sm:p-7 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Live & Auto-Generated
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                          XML Sitemap (`/sitemap.xml`)
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                          Your sitemap is generated dynamically at the edge. Whenever products, categories, or pages are added or modified, Google discovers the updates automatically with image tags and lastmod timestamps.
                        </p>
                      </div>

                      <a
                        href={`https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                      >
                        <span>Submit to Search Console</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* URL Bar */}
                    <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <div className="flex-1 px-3 py-1.5 text-xs font-mono text-slate-700 select-all truncate">
                        {liveSitemapUrl}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(liveSitemapUrl, 'sitemap')}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          {copiedKey === 'sitemap' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'sitemap' ? 'Copied' : 'Copy URL'}</span>
                        </button>
                        <a
                          href={liveSitemapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View XML</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Stat breakdown */}
                  <div className="p-6 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Indexed URLs</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{totalUrlsCount}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Live store links</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Products</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{stats.products}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">With Google Image tags</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categories</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{stats.categories}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Active catalog hubs</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Custom Pages</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{stats.pages}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">About, Policy & terms</div>
                    </div>
                  </div>
                </div>

                {/* Robots.txt Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Crawler Directives (`/robots.txt`)
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Instructs Googlebot, Bingbot, and other crawlers which sections to index while keeping admin files private.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(liveRobotsUrl, 'robots')}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                      >
                        {copiedKey === 'robots' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'robots' ? 'Copied' : 'Copy URL'}</span>
                      </button>
                      <a
                        href={liveRobotsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View robots.txt</span>
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-xs text-slate-700 space-y-1">
                    <div>User-agent: *</div>
                    <div>Allow: /</div>
                    <div>Allow: /product/*</div>
                    <div>Allow: /shop</div>
                    <div className="text-amber-700">Disallow: /admin</div>
                    <div className="text-amber-700">Disallow: /admin/*</div>
                    <div className="text-amber-700">Disallow: /signin</div>
                    <div className="text-blue-700 pt-1">Sitemap: {liveSitemapUrl}</div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: WEBMASTER & DOMAIN VERIFICATION */}
            {activeTab === 'verification' && (
              <div className="space-y-6">
                
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-bold text-slate-900">Webmaster & domain ownership tags</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify domain ownership in Google Search Console, Bing Webmaster, and Meta Business without editing code or uploading HTML files.
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Google Search Console */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                            Google Search Console verification token
                          </label>
                          {settings.google_site_verification ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Connected
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Not configured</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={settings.google_site_verification}
                          onChange={(e) => setSettings({ ...settings, google_site_verification: e.target.value })}
                          placeholder="e.g. 7Abc_xyz1234567890abcdefghijklmnopqrstuvwxyz"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                        />
                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                          <strong>How to get this code:</strong> In Google Search Console, go to <em>Settings &gt; Ownership verification &gt; HTML tag</em>. Copy only the code inside <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">content="..."</code>.
                        </div>
                      </div>

                      {/* Bing Webmaster */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-teal-600" />
                            Bing Webmaster Tools verification token
                          </label>
                          {settings.bing_site_verification ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Connected
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Not configured</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={settings.bing_site_verification}
                          onChange={(e) => setSettings({ ...settings, bing_site_verification: e.target.value })}
                          placeholder="e.g. 32-character hexadecimal code"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                        />
                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                          <strong>How to get this code:</strong> In Bing Webmaster Tools, choose <em>Add Site &gt; HTML Meta Tag</em>. Copy the 32-character hexadecimal code.
                        </div>
                      </div>

                      {/* Facebook Domain Verification */}
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            Meta / Facebook Domain Verification tag (optional)
                          </label>
                          {settings.fb_domain_verification ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Connected
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Not configured</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={settings.fb_domain_verification}
                          onChange={(e) => setSettings({ ...settings, fb_domain_verification: e.target.value })}
                          placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j"
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                        />
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          From Meta Business Suite &gt; Brand Safety &gt; Domains &gt; Verify Domain &gt; HTML tag.
                        </p>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            )}

          </form>

        </div>
      )}

    </div>
  );
}
