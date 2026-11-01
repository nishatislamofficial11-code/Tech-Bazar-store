import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import { initFacebookPixel, sendServerEvent, generateEventId } from '../../lib/fbPixel';
import { initTiktokPixel } from '../../lib/ttPixel';
import toast from 'react-hot-toast';
import { 
  Save, Play, Copy, Check, ExternalLink, Eye, EyeOff, 
  HelpCircle, Download, FileText, ChevronDown, ChevronUp,
  Layers, CheckCircle2, ShieldCheck, Zap, Activity
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

type TabType = 'facebook' | 'tiktok' | 'gtm' | 'catalog';

export default function AdminFacebookPixel() {
  const { settings, refreshSettings } = useSettings();
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingFeed, setExportingFeed] = useState(false);
  const [testingEvent, setTestingEvent] = useState(false);
  
  // Platform Tabs
  const [activeTab, setActiveTab] = useState<TabType>('facebook');

  // Sensitive token visibility
  const [showFbToken, setShowFbToken] = useState(false);
  const [showTtToken, setShowTtToken] = useState(false);

  // Guide accordion toggles
  const [showFbGuide, setShowFbGuide] = useState(false);
  const [showTtGuide, setShowTtGuide] = useState(false);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);

  // Copied state tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // General State
  const [gtmId, setGtmId] = useState('');

  // Facebook State
  const [fbPixelEnabled, setFbPixelEnabled] = useState(false);
  const [fbPixelId, setFbPixelId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [fbDomainVerification, setFbDomainVerification] = useState('');
  const [fbTestEventCode, setFbTestEventCode] = useState('');
  const [fbTrackPageViewOpt, setFbTrackPageViewOpt] = useState(true);
  const [fbTrackViewContentOpt, setFbTrackViewContentOpt] = useState(true);
  const [fbTrackAddToCartOpt, setFbTrackAddToCartOpt] = useState(true);
  const [fbTrackCheckoutOpt, setFbTrackCheckoutOpt] = useState(true);
  const [fbTrackPurchaseOpt, setFbTrackPurchaseOpt] = useState(true);
  const [fbTrackSearchOpt, setFbTrackSearchOpt] = useState(true);

  // TikTok State
  const [ttPixelEnabled, setTtPixelEnabled] = useState(false);
  const [ttPixelId, setTtPixelId] = useState('');
  const [ttAccessToken, setTtAccessToken] = useState('');
  const [ttTestEventCode, setTtTestEventCode] = useState('');
  const [ttTrackPageViewOpt, setTtTrackPageViewOpt] = useState(true);
  const [ttTrackViewContentOpt, setTtTrackViewContentOpt] = useState(true);
  const [ttTrackAddToCartOpt, setTtTrackAddToCartOpt] = useState(true);
  const [ttTrackCheckoutOpt, setTtTrackCheckoutOpt] = useState(true);
  const [ttTrackPurchaseOpt, setTtTrackPurchaseOpt] = useState(true);
  const [ttTrackSearchOpt, setTtTrackSearchOpt] = useState(true);

  useEffect(() => {
    if (settings) {
      setGtmId(settings.gtm_id || '');
      setFbPixelEnabled(settings.fb_pixel_enabled === 'true');
      setFbPixelId(settings.fb_pixel_id || '');
      setFbAccessToken(settings.fb_pixel_access_token || '');
      setFbDomainVerification(settings.fb_domain_verification || '');
      setFbTestEventCode(settings.fb_pixel_test_code || '');
      setFbTrackPageViewOpt(settings.fb_pixel_track_pageview !== 'false');
      setFbTrackViewContentOpt(settings.fb_pixel_track_viewcontent !== 'false');
      setFbTrackAddToCartOpt(settings.fb_pixel_track_addtocart !== 'false');
      setFbTrackCheckoutOpt(settings.fb_pixel_track_checkout !== 'false');
      setFbTrackPurchaseOpt(settings.fb_pixel_track_purchase !== 'false');
      setFbTrackSearchOpt(settings.fb_pixel_track_search !== 'false');

      setTtPixelEnabled(settings.tt_pixel_enabled === 'true');
      setTtPixelId(settings.tt_pixel_id || '');
      setTtAccessToken(settings.tiktok_access_token || '');
      setTtTestEventCode(settings.tiktok_test_event_code || '');
      setTtTrackPageViewOpt(settings.tt_pixel_track_pageview !== 'false');
      setTtTrackViewContentOpt(settings.tt_pixel_track_viewcontent !== 'false');
      setTtTrackAddToCartOpt(settings.tt_pixel_track_addtocart !== 'false');
      setTtTrackCheckoutOpt(settings.tt_pixel_track_checkout !== 'false');
      setTtTrackPurchaseOpt(settings.tt_pixel_track_purchase !== 'false');
      setTtTrackSearchOpt(settings.tt_pixel_track_search !== 'false');
    }
  }, [settings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const updates = [
        { key: 'gtm_id', value: gtmId.trim() },
        { key: 'fb_pixel_enabled', value: fbPixelEnabled ? 'true' : 'false' },
        { key: 'fb_pixel_id', value: fbPixelId.trim() },
        { key: 'fb_pixel_access_token', value: fbAccessToken.trim() },
        { key: 'fb_domain_verification', value: fbDomainVerification.trim() },
        { key: 'fb_pixel_test_code', value: fbTestEventCode.trim() },
        { key: 'fb_pixel_track_pageview', value: fbTrackPageViewOpt ? 'true' : 'false' },
        { key: 'fb_pixel_track_viewcontent', value: fbTrackViewContentOpt ? 'true' : 'false' },
        { key: 'fb_pixel_track_addtocart', value: fbTrackAddToCartOpt ? 'true' : 'false' },
        { key: 'fb_pixel_track_checkout', value: fbTrackCheckoutOpt ? 'true' : 'false' },
        { key: 'fb_pixel_track_purchase', value: fbTrackPurchaseOpt ? 'true' : 'false' },
        { key: 'fb_pixel_track_search', value: fbTrackSearchOpt ? 'true' : 'false' },

        { key: 'tt_pixel_enabled', value: ttPixelEnabled ? 'true' : 'false' },
        { key: 'tt_pixel_id', value: ttPixelId.trim() },
        { key: 'tiktok_access_token', value: ttAccessToken.trim() },
        { key: 'tiktok_test_event_code', value: ttTestEventCode.trim() },
        { key: 'tt_pixel_track_pageview', value: ttTrackPageViewOpt ? 'true' : 'false' },
        { key: 'tt_pixel_track_viewcontent', value: ttTrackViewContentOpt ? 'true' : 'false' },
        { key: 'tt_pixel_track_addtocart', value: ttTrackAddToCartOpt ? 'true' : 'false' },
        { key: 'tt_pixel_track_checkout', value: ttTrackCheckoutOpt ? 'true' : 'false' },
        { key: 'tt_pixel_track_purchase', value: ttTrackPurchaseOpt ? 'true' : 'false' },
        { key: 'tt_pixel_track_search', value: ttTrackSearchOpt ? 'true' : 'false' }
      ];

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'store_id,key' });

      if (error) throw error;

      await refreshSettings();
      if (fbPixelEnabled && fbPixelId.trim()) {
        initFacebookPixel(fbPixelId.trim());
      }
      if (ttPixelEnabled && ttPixelId.trim()) {
        initTiktokPixel(ttPixelId.trim());
      }
      toast.success('Tracking settings saved successfully');
    } catch (err: any) {
      console.error('Error saving pixel settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCatalog = async () => {
    setExportingFeed(true);
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!products || products.length === 0) {
        toast.error('No products found to export.');
        return;
      }

      const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
      const siteUrl = window.location.origin;
      const hostBrand = typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname.replace(/^www\./i, '').split('.')[0]
        : 'Store';
      const siteName = settings?.siteName || (hostBrand !== 'localhost' ? hostBrand.charAt(0).toUpperCase() + hostBrand.slice(1) : 'Store');

      const rows = products.map((p) => {
        const id = p.id;
        const title = `"${(p.title || p.name || '').replace(/"/g, '""')}"`;
        const cleanDesc = (p.description || p.title || '').replace(/<[^>]*>?/gm, '').replace(/"/g, '""').trim();
        const description = `"${cleanDesc.slice(0, 500)}"`;
        const availability = (p.stock ?? 100) > 0 ? 'in stock' : 'out of stock';
        const condition = 'new';
        const price = `"${p.price || 0} BDT"`;
        const link = `"${siteUrl}/product/${p.slug || p.id}"`;
        const imageLink = `"${p.image || ''}"`;
        const brand = `"${(p.store || siteName).replace(/"/g, '""')}"`;

        return [id, title, description, availability, condition, price, link, imageLink, brand].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `catalog_feed_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Product catalog CSV downloaded');
    } catch (err: any) {
      toast.error('Failed to export catalog feed: ' + err.message);
    } finally {
      setExportingFeed(false);
    }
  };

  const handleTestEvent = async () => {
    setTestingEvent(true);
    if (activeTab === 'facebook') {
      const targetPixelId = fbPixelId.trim();
      if (!targetPixelId) {
        toast.error('Please enter a Pixel ID first.');
        setTestingEvent(false);
        return;
      }
      try {
        initFacebookPixel(targetPixelId);
        const testEventId = generateEventId('test_admin_meta');
        if ((window as any).fbq) {
          (window as any).fbq('track', 'ViewContent', {
            content_name: 'Admin Test Product',
            content_type: 'product',
            value: 100,
            currency: 'BDT'
          }, { eventID: testEventId });
        }
        await sendServerEvent('ViewContent', {
          content_name: 'Admin Test Product',
          content_type: 'product',
          value: 100,
          currency: 'BDT'
        }, testEventId);
        toast.success('Test event sent to Meta Pixel & CAPI (Browser + Server)');
      } catch (err: any) {
        toast.error('Error sending test event: ' + err.message);
      } finally {
        setTimeout(() => setTestingEvent(false), 600);
      }
    } else if (activeTab === 'tiktok') {
      const targetPixelId = ttPixelId.trim();
      if (!targetPixelId) {
        toast.error('Please enter a TikTok Pixel ID first.');
        setTestingEvent(false);
        return;
      }
      try {
        initTiktokPixel(targetPixelId);
        const testEventId = generateEventId('test_admin_tt');
        if ((window as any).ttq) {
          (window as any).ttq.track('ViewContent', {
            contents: [{
              content_id: 'test_101',
              content_name: 'Admin Test Product',
              content_type: 'product',
              price: 100,
              quantity: 1
            }],
            content_type: 'product',
            value: 100,
            currency: 'BDT'
          }, { event_id: testEventId });
        }
        await sendServerEvent('ViewContent', {
          content_ids: ['test_101'],
          content_name: 'Admin Test Product',
          content_type: 'product',
          value: 100,
          currency: 'BDT'
        }, testEventId);
        toast.success('Test event sent to TikTok Pixel & Events API (Browser + Server)');
      } catch (err: any) {
        toast.error('Error sending test event: ' + err.message);
      } finally {
        setTimeout(() => setTestingEvent(false), 600);
      }
    } else if (activeTab === 'gtm') {
      if ((window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'admin_test_event',
          timestamp: new Date().toISOString()
        });
        toast.success('Test event pushed to window.dataLayer');
      } else {
        toast.error('Google Tag Manager dataLayer is not yet initialized.');
      }
      setTimeout(() => setTestingEvent(false), 600);
    } else {
      setTestingEvent(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fbPixelCodeSnippet = `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${fbPixelId || 'YOUR_PIXEL_ID'}');
fbq('track', 'PageView');
</script>
<!-- Server-side Conversions API (CAPI) active via /api/track -->`;

  const ttPixelCodeSnippet = `<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
  ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
  ttq.load('${ttPixelId || 'YOUR_PIXEL_ID'}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- Server-side Events API active via /api/track -->`;

  const gtmCodeSnippet = `<!-- Google Tag Manager Container -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId || 'GTM-XXXXXXX'}');
</script>
<!-- GA4 eCommerce dataLayer.push active on product views, checkout, and purchase -->`;

  const getActiveSnippet = () => {
    switch (activeTab) {
      case 'facebook': return fbPixelCodeSnippet;
      case 'tiktok': return ttPixelCodeSnippet;
      case 'gtm': return gtmCodeSnippet;
      default: return fbPixelCodeSnippet;
    }
  };

  const tabs: { id: TabType; label: string; activeStatus: boolean }[] = [
    { id: 'facebook', label: 'Meta Pixel & CAPI', activeStatus: Boolean(fbPixelEnabled && fbPixelId) },
    { id: 'tiktok', label: 'TikTok Events API', activeStatus: Boolean(ttPixelEnabled && ttPixelId) },
    { id: 'gtm', label: 'Google Tag Manager (GTM)', activeStatus: Boolean(gtmId) },
    { id: 'catalog', label: 'Product Catalog Feeds (DPA)', activeStatus: true },
  ];

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading tracking configuration..." />;
  }

  const liveXmlFeedUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/catalog-feed.php` : '/api/catalog-feed.php';
  const liveCsvFeedUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/catalog-feed.php?format=csv` : '/api/catalog-feed.php?format=csv';

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
            <span className="text-slate-900 font-bold">Tracking</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tracking Pixels & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure Meta Pixel & CAPI, TikTok Events API, Google Tag Manager, and dynamic catalog feeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleTestEvent}
            disabled={testingEvent}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Send test event"
          >
            <Play className={`w-3.5 h-3.5 text-slate-900 ${testingEvent ? 'animate-spin' : ''}`} />
            <span>{testingEvent ? 'Testing...' : 'Test Event'}</span>
          </button>

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

      {/* 2. Clean Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
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
                <span className={`w-2 h-2 rounded-full ${tab.activeStatus ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ========================================================
            TAB 1: META (FACEBOOK) PIXEL & CONVERSIONS API (CAPI)
           ======================================================== */}
        {activeTab === 'facebook' && (
          <div className="space-y-6">
            
            {/* Credentials Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-bold text-slate-900">Meta Pixel & Conversions API (CAPI)</h2>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/80">
                      Browser + Server Deduplicated
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                    Tracks customer interactions in both the browser and server-side via Cloudflare Edge with SHA-256 phone and email hashing.
                  </p>
                </div>

                {/* Master Switch */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-700">
                    {fbPixelEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFbPixelEnabled(!fbPixelEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      fbPixelEnabled ? 'bg-slate-900' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={fbPixelEnabled}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                        fbPixelEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Pixel ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Dataset / Pixel ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fbPixelId}
                      onChange={(e) => setFbPixelId(e.target.value)}
                      placeholder="e.g. 1574148121034891"
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Found in Meta Events Manager &gt; Data Sources &gt; Dataset ID.
                    </p>
                  </div>

                  {/* CAPI Access Token */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-800">
                        Conversions API Access Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowFbGuide(!showFbGuide)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        <span>Where to get this?</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showFbToken ? 'text' : 'password'}
                        value={fbAccessToken}
                        onChange={(e) => setFbAccessToken(e.target.value)}
                        placeholder="EAAB..."
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFbToken(!showFbToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={showFbToken ? 'Hide token' : 'Show token'}
                      >
                        {showFbToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Required for server-side CAPI event dispatching to bypass iOS and adblockers.
                    </p>
                  </div>
                </div>

                {/* Collapsible Guide */}
                {showFbGuide && (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                    <div className="font-bold text-slate-900">
                      How to generate your Meta Conversions API Access Token:
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                      <li>Go to <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Meta Events Manager <ExternalLink className="w-2.5 h-2.5 inline" /></a> and select your Pixel / Dataset.</li>
                      <li>Click the <strong>Settings</strong> tab and scroll down to the <strong>Conversions API</strong> section.</li>
                      <li>Under "Set up manually", click <strong>Generate access token</strong>, copy the token, and paste it here.</li>
                    </ol>
                  </div>
                )}

                {/* Test Event Code & Domain Verification */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Test event code <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={fbTestEventCode}
                      onChange={(e) => setFbTestEventCode(e.target.value)}
                      placeholder="e.g. TEST12345"
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Only used when testing in Events Manager &gt; "Test Events" tab. Leave blank for live production ads.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Meta domain verification token <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={fbDomainVerification}
                      onChange={(e) => setFbDomainVerification(e.target.value)}
                      placeholder="e.g. abcdef1234567890xyz"
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Automatically injects the meta verification tag into storefront header for Meta Business Manager.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Event Toggles Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Standard Meta CAPI Events</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Choose which events to dispatch to Meta Pixel and Conversions API.</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Deduplication Active (Event ID)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  { id: 'pageview', label: 'PageView', state: fbTrackPageViewOpt, setter: setFbTrackPageViewOpt, desc: 'Fires on every page load', server: true },
                  { id: 'viewcontent', label: 'ViewContent', state: fbTrackViewContentOpt, setter: setFbTrackViewContentOpt, desc: 'Fires when viewing a product page', server: true },
                  { id: 'addtocart', label: 'AddToCart', state: fbTrackAddToCartOpt, setter: setFbTrackAddToCartOpt, desc: 'Fires when an item is added to cart', server: true },
                  { id: 'checkout', label: 'InitiateCheckout', state: fbTrackCheckoutOpt, setter: setFbTrackCheckoutOpt, desc: 'Fires when checkout form is opened', server: true },
                  { id: 'purchase', label: 'Purchase', state: fbTrackPurchaseOpt, setter: setFbTrackPurchaseOpt, desc: 'Fires upon confirmed order with customer data', server: true, highEmq: true },
                  { id: 'search', label: 'Search', state: fbTrackSearchOpt, setter: setFbTrackSearchOpt, desc: 'Fires when customer performs product search', server: false },
                ].map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => ev.setter(!ev.state)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                      ev.state
                        ? 'bg-slate-50/70 border-slate-300 shadow-2xs'
                        : 'bg-white border-slate-200/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{ev.label}</span>
                        {ev.highEmq && (
                          <span className="ml-1.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            High Match Quality
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={ev.state}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer pointer-events-none"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                      <span>{ev.desc}</span>
                      {ev.server && <span className="text-slate-700 font-semibold shrink-0">Server CAPI</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: TIKTOK PIXEL & EVENTS API
           ======================================================== */}
        {activeTab === 'tiktok' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">TikTok Pixel & Events API</h2>
                  <p className="text-xs text-slate-500 max-w-xl leading-relaxed mt-0.5">
                    Track conversions from TikTok Ads through browser tracking and server-side Events API.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-700">
                    {ttPixelEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTtPixelEnabled(!ttPixelEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      ttPixelEnabled ? 'bg-slate-900' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={ttPixelEnabled}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                        ttPixelEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      TikTok Pixel ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ttPixelId}
                      onChange={(e) => setTtPixelId(e.target.value)}
                      placeholder="e.g. C1234567890ABCDEFG"
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      From TikTok Ads Manager &gt; Assets &gt; Events &gt; Web Events.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-800">
                        Events API Access Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTtGuide(!showTtGuide)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        <span>Guide</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showTtToken ? 'text' : 'password'}
                        value={ttAccessToken}
                        onChange={(e) => setTtAccessToken(e.target.value)}
                        placeholder="0123456789abcdef..."
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTtToken(!showTtToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={showTtToken ? 'Hide token' : 'Show token'}
                      >
                        {showTtToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Required for server-side TikTok Events API reporting.
                    </p>
                  </div>
                </div>

                {showTtGuide && (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                    <div className="font-bold text-slate-900">
                      TikTok Events API Token Setup:
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                      <li>In TikTok Ads Manager, go to <strong>Assets &gt; Events &gt; Web Events</strong>.</li>
                      <li>Select your Pixel &gt; <strong>Settings</strong> &gt; scroll to <strong>Events API</strong>.</li>
                      <li>Click <strong>Generate Access Token</strong> and paste it here.</li>
                    </ol>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 max-w-md">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Test event code <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ttTestEventCode}
                    onChange={(e) => setTtTestEventCode(e.target.value)}
                    placeholder="e.g. TEST12345"
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                  />
                </div>
              </div>
            </div>

            {/* TikTok Event Toggles */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
              <h3 className="text-sm font-bold text-slate-900 mb-1">TikTok Tracked Events</h3>
              <p className="text-xs text-slate-500 mb-5">Select events to dispatch to TikTok Pixel and Events API.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  { id: 'pageview', label: 'Pageview', state: ttTrackPageViewOpt, setter: setTtTrackPageViewOpt, desc: 'Fires on page load' },
                  { id: 'viewcontent', label: 'ViewContent', state: ttTrackViewContentOpt, setter: setTtTrackViewContentOpt, desc: 'Product detail view' },
                  { id: 'addtocart', label: 'AddToCart', state: ttTrackAddToCartOpt, setter: setTtTrackAddToCartOpt, desc: 'Product added to cart' },
                  { id: 'checkout', label: 'InitiateCheckout', state: ttTrackCheckoutOpt, setter: setTtTrackCheckoutOpt, desc: 'Checkout flow initiated' },
                  { id: 'purchase', label: 'CompletePayment', state: ttTrackPurchaseOpt, setter: setTtTrackPurchaseOpt, desc: 'Order confirmed successfully' },
                  { id: 'search', label: 'Search', state: ttTrackSearchOpt, setter: setTtTrackSearchOpt, desc: 'Product search performed' },
                ].map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => ev.setter(!ev.state)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                      ev.state
                        ? 'bg-slate-50/70 border-slate-300 shadow-2xs'
                        : 'bg-white border-slate-200/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{ev.label}</span>
                      <input
                        type="checkbox"
                        checked={ev.state}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer pointer-events-none"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                      {ev.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 3: GOOGLE TAG MANAGER (GTM) & GA4 DATALAYER
           ======================================================== */}
        {activeTab === 'gtm' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
              <h2 className="text-base font-bold text-slate-900 mb-1">Google Tag Manager Container</h2>
              <p className="text-xs text-slate-500 mb-5">
                Automatically injects GTM container snippet across all pages and pushes official GA4 eCommerce schema events.
              </p>

              <div className="max-w-md">
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Container ID (GTM-XXXXXXX)
                </label>
                <input
                  type="text"
                  value={gtmId}
                  onChange={(e) => setGtmId(e.target.value)}
                  placeholder="e.g. GTM-MLLNJK2"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-2xs font-normal"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Found in <a href="https://tagmanager.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Google Tag Manager</a> header.
                </p>
              </div>
            </div>

            {/* Active DataLayer Events */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Native GA4 eCommerce DataLayer Events</h3>
                  <p className="text-xs text-slate-500">Pushed to window.dataLayer on every user interaction.</p>
                </div>
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  GA4 Schema Compliant
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  { name: 'page_view', desc: 'Fires on every route change with page_location and page_path' },
                  { name: 'view_item', desc: 'Pushes product id, title, price, and category when viewing product' },
                  { name: 'add_to_cart', desc: 'Pushes items array and cart total value when adding to cart' },
                  { name: 'begin_checkout', desc: 'Pushes items and checkout total value when opening order form' },
                  { name: 'purchase', desc: 'Pushes transaction_id, items array, and total order value upon confirmation' },
                ].map((ev) => (
                  <div key={ev.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-900">{ev.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{ev.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: PRODUCT CATALOG FEEDS (DYNAMIC PRODUCT ADS)
           ======================================================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Dynamic Product Catalog Feeds (DPA)</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                    Automatically synchronize your store inventory with Meta Commerce Manager & TikTok Catalog for Dynamic Retargeting Ads and Instagram Shopping.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportCatalog}
                  disabled={exportingFeed}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportingFeed ? 'Generating...' : 'Download Catalog CSV'}</span>
                </button>
              </div>

              <div className="pt-5 space-y-5">
                
                {/* XML Feed */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800">
                      Live XML / RSS feed URL <span className="text-emerald-700 font-semibold">(Recommended)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Meta Commerce & TikTok compatible</span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <div className="flex-1 px-2.5 text-xs font-mono text-slate-700 select-all truncate">
                      {liveXmlFeedUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(liveXmlFeedUrl, 'xml_feed')}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
                    >
                      {copiedKey === 'xml_feed' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'xml_feed' ? 'Copied' : 'Copy URL'}</span>
                    </button>
                    <a
                      href={liveXmlFeedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Feed</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Use this URL inside Meta Commerce Manager &gt; Catalogs &gt; Data Sources &gt; "Scheduled Feed" (recommended sync interval: hourly or daily).
                  </p>
                </div>

                {/* CSV Feed */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800">
                      Alternative live CSV feed URL
                    </label>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <div className="flex-1 px-2.5 text-xs font-mono text-slate-700 select-all truncate">
                      {liveCsvFeedUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(liveCsvFeedUrl, 'csv_feed')}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
                    >
                      {copiedKey === 'csv_feed' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'csv_feed' ? 'Copied' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* 3. Clean Light Code Snippet Accordion (Replaces the dark terminal) */}
        {activeTab !== 'catalog' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCodeSnippet(!showCodeSnippet)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">
                  View Generated Script Snippet
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Injected automatically into storefront)
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs font-medium">{showCodeSnippet ? 'Hide' : 'Show'}</span>
                {showCodeSnippet ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showCodeSnippet && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/70">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    {activeTab === 'facebook' ? 'Meta Pixel & CAPI Script' : activeTab === 'tiktok' ? 'TikTok Pixel Script' : 'GTM Container Snippet'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getActiveSnippet(), 'code_snippet')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  >
                    {copiedKey === 'code_snippet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'code_snippet' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-white border border-slate-200/80 rounded-xl font-mono text-xs text-slate-800 overflow-x-auto leading-relaxed shadow-2xs">
                  {getActiveSnippet()}
                </pre>
              </div>
            )}
          </div>
        )}

      </form>
    </div>
  );
}