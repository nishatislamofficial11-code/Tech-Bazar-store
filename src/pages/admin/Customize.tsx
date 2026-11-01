import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
  Save,
  Palette,
  Layout,
  Smartphone,
  Loader2,
  Sparkles,
  Type,
  Megaphone,
  ShoppingBag,
  RotateCcw,
  Sliders,
  Check,
  CheckCircle2,
  Copy,
  Link as LinkIcon,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useSettings } from '../../contexts/SettingsContext';

interface ThemeState {
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_bg_tone: string;
  theme_font_family: string;
  theme_radius: string;
  theme_card_style: string;
  theme_button_style: string;
  theme_header_style: string;
  theme_header_sticky: string;
  theme_bottom_nav_style: string;
  theme_category_style: string;
  theme_footer_style: string;
  theme_announcement_enabled: string;
  theme_announcement_text: string;
  theme_announcement_marquee: string;
  theme_announcement_bg: string;
  theme_announcement_color: string;
  theme_announcement_link: string;
  active_theme: string;
}

const DEFAULT_SETTINGS: ThemeState = {
  theme_primary_color: '#0066ff',
  theme_secondary_color: '#10b981',
  theme_bg_tone: '#f8fafc',
  theme_font_family: 'Manrope',
  theme_radius: '16px',
  theme_card_style: 'modern-elevated',
  theme_button_style: 'solid',
  theme_header_style: 'default',
  theme_header_sticky: 'true',
  theme_bottom_nav_style: 'default',
  theme_category_style: 'grid',
  theme_footer_style: 'light',
  theme_announcement_enabled: 'false',
  theme_announcement_text: '⚡ সারা দেশে ২-৩ দিনে ক্যাশ অন ডেলিভারি! আজই অর্ডার করুন!',
  theme_announcement_marquee: 'true',
  theme_announcement_bg: '#0066ff',
  theme_announcement_color: '#ffffff',
  theme_announcement_link: '',
  active_theme: 'default',
};

const QUICK_COLORS = [
  { name: 'Cyber Blue', hex: '#0066ff' },
  { name: 'Royal Sapphire', hex: '#2563eb' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Natural Green', hex: '#16a34a' },
  { name: 'Velvet Rose', hex: '#e11d48' },
  { name: 'Hot Pink', hex: '#db2777' },
  { name: 'Vibrant Amber', hex: '#ea580c' },
  { name: 'Warm Orange', hex: '#f97316' },
  { name: 'Cyber Violet', hex: '#7c3aed' },
  { name: 'Deep Indigo', hex: '#4f46e5' },
  { name: 'Onyx Slate', hex: '#0f172a' },
  { name: 'Rich Crimson', hex: '#dc2626' },
];

const CANVAS_TONES = [
  { id: '#ffffff', name: 'Clean White', desc: 'মিনিমালিস্ট ও ফ্রেশ পিউর হোয়াইট' },
  { id: '#f8fafc', name: 'Soft Slate', desc: 'আই-ফ্রেন্ডলি মডার্ন সফট স্লেট' },
  { id: '#faf9f6', name: 'Warm Linen', desc: 'প্রিমিয়াম বুটিক ওয়ার্ম টেক্সচার' },
  { id: '#f1f5f9', name: 'Cool Gray', desc: 'টেক কনট্রাস্ট স্লিক ব্যাকগ্রাউন্ড' },
];

const FONT_OPTIONS = [
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', style: 'Modern, Trendy & Startup Grade' },
  { id: 'Manrope', name: 'Manrope', style: 'Tech, Clean & E-Commerce Standard' },
  { id: 'Outfit', name: 'Outfit', style: 'Fashion, Streetwear & Energetic' },
  { id: 'Inter', name: 'Inter', style: 'Ultra-Clean, Global Standard' },
];

const RADIUS_OPTIONS = [
  { id: '4px', name: 'Sharp (4px)', desc: 'আর্কিটেকচারাল ও ক্রিস্প শার্প লুক' },
  { id: '8px', name: 'Subtle (8px)', desc: 'ক্লিন অ্যাপল-স্টাইল সাবটেল কার্ভ' },
  { id: '16px', name: 'Smooth (16px)', desc: 'ব্যালেন্সড ও স্ট্যান্ডার্ড ই-কমার্স' },
  { id: '24px', name: 'Ultra Pill (24px)', desc: 'ট্রেন্ডি, প্লেফুল ও বাবলি মোবাইল লুক' },
];

const CARD_STYLES = [
  {
    id: 'modern-elevated',
    name: 'Modern Elevated (ডিফল্ট)',
    desc: 'সফট শ্যাডো, প্রিমিয়াম বর্ডার ও স্মুথ কার্ড হোভার এলিভেশন',
  },
  {
    id: 'minimal-border',
    name: 'Minimal Clean (মিনিমাল বর্ডার)',
    desc: 'কোনো ভারী শ্যাডো ছাড়া স্লিক ২পিক্সেল বর্ডার ও অ্যাপল-লাইক লুক',
  },
  {
    id: 'floating-glass',
    name: 'Floating Glass (গ্লাস ও গ্লো)',
    desc: 'ট্রান্সলুসেন্ট গ্লাস ব্যাকড্রপ, ভাসমান ভাইব ও এলিগ্যান্ট শ্যাডো',
  },
  {
    id: 'compact-retail',
    name: 'Compact Retail (কম্প্যাক্ট রিটেইল)',
    desc: 'কম্প্যাক্ট প্যাডিং, হাই-কনট্রাস্ট প্রাইস ও ফাস্ট অর্ডার লুক',
  },
];

const BUTTON_STYLES = [
  { id: 'solid', name: 'Solid Vibrant', desc: 'ফুল সলিড কালার উইথ সফট শ্যাডো' },
  { id: 'pill', name: 'Rounded Pill', desc: 'সম্পূর্ণ গোল পিল শেপ উইথ স্মুথ কার্ভ' },
  { id: 'gradient', name: 'Smooth Gradient', desc: 'ব্র্যান্ড শেডের আল্ট্রা-প্রিমিয়াম গ্রেডিয়েন্ট' },
  { id: 'outline', name: 'Modern Outline', desc: 'ক্লিন ২পিক্সেল আউটলাইন উইথ হোভার ফিল' },
];

export default function AdminCustomize() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'navigation' | 'components'>('colors');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonConfigInput, setJsonConfigInput] = useState('');
  const [copied, setCopied] = useState(false);

  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<ThemeState>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('settings').select('*');

      if (error) {
        toast.error(`Failed to load settings: ${error.message}`);
      } else if (data) {
        const newSettings = { ...DEFAULT_SETTINGS };
        data.forEach((item) => {
          if (item.key in newSettings) {
            (newSettings as any)[item.key] = item.value;
          }
        });
        setSettings(newSettings);
      }
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
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert({ ...update }, { onConflict: 'store_id,key' });

        if (error) throw error;
      }

      toast.success('🎉 থিম ডিজাইন সফলভাবে সেভ করা হয়েছে!');
      await refreshSettings();
    } catch (error: any) {
      console.error('Error saving customizations:', error);
      toast.error(error.message || 'Failed to save customizations');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('আপনি কি সত্যিই সমস্ত থিম ডিজাইন ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?')) {
      setSettings(DEFAULT_SETTINGS);
      toast.success('ডিফল্ট থিম সেটিংস রিস্টোর করা হয়েছে');
    }
  };

  const handleExportJSON = () => {
    const jsonString = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('থিম কনফিগ ক্লিপবোর্ডে কপি হয়েছে!');
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonConfigInput);
      setSettings((prev) => ({ ...prev, ...parsed }));
      setJsonModalOpen(false);
      setJsonConfigInput('');
      toast.success('🎉 থিম কনফিগ সফলভাবে ইমপোর্ট করা হয়েছে!');
    } catch (err) {
      toast.error('ভুল JSON ফরম্যাট! সঠিক থিম JSON প্রদান করুন।');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* Top Header Card - 100% Light Theme */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Palette size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Theme Customization
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-blue-50 text-primary border border-blue-100">
              Pro Studio
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            আপনার ওয়েবসাইটের ব্র্যান্ড কালার, ফন্ট, বর্ডার কার্ভ, নোটিশ বার ও প্রোডাক্ট কার্ড সম্পূর্ণ নিজের মতো সাজিয়ে নিন।
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
            title="Reset to factory settings"
          >
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setJsonModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
            title="Export or Import Theme JSON"
          >
            <Sliders size={15} />
            <span>Preset JSON</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-5 sm:px-6 py-2.5 rounded-xl hover:bg-primary-hover active:scale-95 transition-all text-xs sm:text-sm font-bold shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* 4 Clean Light Tabs - Highly Responsive & Touch Friendly */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'colors', label: 'Branding & Colors', icon: Palette, badge: 'Colors' },
          { id: 'typography', label: 'Typography & Curves', icon: Type, badge: 'Fonts' },
          { id: 'navigation', label: 'Header & Notices', icon: Layout, badge: 'Navbar' },
          { id: 'components', label: 'Cards & Buttons', icon: ShoppingBag, badge: 'Layout' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                  : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BRANDING & COLORS */}
      {activeTab === 'colors' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Colors Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Palette size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  ব্র্যান্ড কালার ইঞ্জিন (Brand Colors)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  ওয়েবসাইটের বাটন, আইকন, হাইলাইট ও টেক্সটের মূল কালার প্যালেট নির্বাচন করুন
                </p>
              </div>
            </div>

            {/* Primary Brand Color */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                প্রাইমারি ব্র্যান্ড কালার (Primary Brand Color)
              </label>
              <div className="flex items-center gap-4 flex-wrap">
                <input
                  type="color"
                  value={settings.theme_primary_color}
                  onChange={(e) => setSettings({ ...settings, theme_primary_color: e.target.value })}
                  className="h-12 w-20 cursor-pointer rounded-2xl border border-slate-200 p-1 shadow-inner bg-slate-50"
                />
                <input
                  type="text"
                  value={settings.theme_primary_color}
                  onChange={(e) => setSettings({ ...settings, theme_primary_color: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase font-mono font-bold text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 w-36 bg-slate-50/50"
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl shadow-sm border-2 border-white"
                    style={{ backgroundColor: settings.theme_primary_color }}
                  />
                  <span className="text-xs text-slate-500 font-medium">লাইভ ব্র্যান্ড অ্যাক্টিভ প্রিভিউ</span>
                </div>
              </div>

              {/* Quick Swatches */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 mb-2.5 block">
                  জনপ্রিয় কালার সোয়াচ (Quick Swatches):
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {QUICK_COLORS.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setSettings({ ...settings, theme_primary_color: swatch.hex })}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-xs transition-all hover:scale-110 active:scale-95 flex items-center justify-center border-2 cursor-pointer ${
                        settings.theme_primary_color.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'border-slate-800 ring-2 ring-slate-800/20 scale-105'
                          : 'border-white'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    >
                      {settings.theme_primary_color.toLowerCase() === swatch.hex.toLowerCase() && (
                        <Check size={16} className="text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Accent Color */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                অ্যাকসেন্ট / ডিসকাউন্ট ব্যাজ কালার (Secondary Accent Color)
              </label>
              <p className="text-xs text-slate-500">
                অফার ট্যাগ, ডিসকাউন্ট ব্যাজ (-20% OFF) ও স্পেশাল হাইলাইটে এই রং ব্যবহৃত হবে
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <input
                  type="color"
                  value={settings.theme_secondary_color || '#10b981'}
                  onChange={(e) => setSettings({ ...settings, theme_secondary_color: e.target.value })}
                  className="h-12 w-20 cursor-pointer rounded-2xl border border-slate-200 p-1 shadow-inner bg-slate-50"
                />
                <input
                  type="text"
                  value={settings.theme_secondary_color || '#10b981'}
                  onChange={(e) => setSettings({ ...settings, theme_secondary_color: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase font-mono font-bold text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 w-36 bg-slate-50/50"
                />
                <div
                  className="px-3.5 py-1.5 rounded-full text-white text-xs font-black shadow-xs tracking-wide"
                  style={{ backgroundColor: settings.theme_secondary_color || '#10b981' }}
                >
                  -30% OFF SAMPLE
                </div>
              </div>
            </div>

            {/* Background Canvas Tone */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                ওয়েবসাইট ব্যাকগ্রাউন্ড ক্যানভাস টোন (Page Background Tone)
              </label>
              <p className="text-xs text-slate-500">
                ওয়েবসাইটের পেজ ব্যাকগ্রাউন্ডের শেইড যা আপনার স্টোরের পরিবেশকে প্রফেশনাল রাখে
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {CANVAS_TONES.map((tone) => {
                  const isSelected = (settings.theme_bg_tone || '#f8fafc') === tone.id;
                  return (
                    <label
                      key={tone.id}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="radio"
                          name="bg_tone"
                          value={tone.id}
                          checked={isSelected}
                          onChange={(e) => setSettings({ ...settings, theme_bg_tone: e.target.value })}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                        <div
                          className="w-7 h-7 rounded-xl border border-slate-300 shadow-inner"
                          style={{ backgroundColor: tone.id }}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{tone.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{tone.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: TYPOGRAPHY & CURVES */}
      {activeTab === 'typography' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Typography */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
                <Type size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  ফন্ট ও টাইপোগ্রাফি ইঞ্জিন (Typography)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  ওয়েবসাইটের জন্য প্রিমিয়াম গুগল ফন্ট নির্বাচন করুন (বাংলা টেক্সট নিখুঁতভাবে প্রদর্শিত হবে)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FONT_OPTIONS.map((font) => {
                const isSelected = (settings.theme_font_family || 'Manrope') === font.id;
                return (
                  <label
                    key={font.id}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="font_family"
                          value={font.id}
                          checked={isSelected}
                          onChange={(e) => setSettings({ ...settings, theme_font_family: e.target.value })}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-extrabold text-slate-900">{font.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 bg-slate-100 rounded-full">
                        Google Font
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-slate-500">{font.style}</div>
                      <div
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-semibold"
                        style={{ fontFamily: font.id }}
                      >
                        স্মার্ট গ্যাজেট ও লাইফস্টাইল • ৳1,450 • Free Home Delivery
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Corner Radius & Curves */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Layout size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  কর্নার রেডিয়াস ও শেপ ইঞ্জিন (Corner Curves)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  ওয়েবসাইটের বাটন, কার্ড, ইমেজ ও ব্যাজসমূহের গোলাকার মাত্রা নিয়ন্ত্রণ করুন
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = (settings.theme_radius || '16px') === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <input
                        type="radio"
                        name="theme_radius"
                        value={opt.id}
                        checked={isSelected}
                        onChange={(e) => setSettings({ ...settings, theme_radius: e.target.value })}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-mono font-bold text-slate-500">{opt.id}</span>
                    </div>

                    {/* Visual Box Preview */}
                    <div
                      className="h-16 bg-slate-100 border border-slate-300 flex items-center justify-center p-2 mb-3 shadow-inner"
                      style={{ borderRadius: opt.id }}
                    >
                      <div
                        className="w-full h-8 bg-primary text-white text-[11px] font-black flex items-center justify-center shadow-xs"
                        style={{ borderRadius: `calc(${opt.id} * 0.75)` }}
                      >
                        অর্ডার করুন
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-sm">{opt.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: HEADER & NOTICES */}
      {activeTab === 'navigation' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Announcement Bar Engine */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    টপ নোটিশ / অ্যানাউন্সমেন্ট বার (Auto-Sliding Announcement Bar)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    হেডারের উপরে অফার বা ফ্রি ডেলিভারির অটো-স্লাইডিং নোটিশ প্রদর্শন করুন
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.theme_announcement_enabled === 'true'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme_announcement_enabled: e.target.checked ? 'true' : 'false',
                    })
                  }
                />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {settings.theme_announcement_enabled === 'true' && (
              <div className="space-y-5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    নোটিশ টেক্সট (Notice Message)
                  </label>
                  <input
                    type="text"
                    value={settings.theme_announcement_text}
                    onChange={(e) => setSettings({ ...settings, theme_announcement_text: e.target.value })}
                    placeholder="যেমন: সারা দেশে ২-৩ দিনে হোম ডেলিভারি! আজই অর্ডার করুন!"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      স্লাইডার মোড (Animation Mode)
                    </label>
                    <select
                      value={settings.theme_announcement_marquee}
                      onChange={(e) => setSettings({ ...settings, theme_announcement_marquee: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                    >
                      <option value="true">অটো-স্লাইডিং (Auto-Sliding Marquee)</option>
                      <option value="false">মাঝখানে স্থির (Static Centered)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      ব্যাকগ্রাউন্ড কালার
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme_announcement_bg || settings.theme_primary_color}
                        onChange={(e) => setSettings({ ...settings, theme_announcement_bg: e.target.value })}
                        className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 p-1 bg-slate-50"
                      />
                      <input
                        type="text"
                        value={settings.theme_announcement_bg || settings.theme_primary_color}
                        onChange={(e) => setSettings({ ...settings, theme_announcement_bg: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono uppercase w-full bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      টেক্সট কালার
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme_announcement_color || '#ffffff'}
                        onChange={(e) => setSettings({ ...settings, theme_announcement_color: e.target.value })}
                        className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 p-1 bg-slate-50"
                      />
                      <input
                        type="text"
                        value={settings.theme_announcement_color || '#ffffff'}
                        onChange={(e) => setSettings({ ...settings, theme_announcement_color: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono uppercase w-full bg-slate-50/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-Time Live Auto-Sliding Marquee Preview */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-600 block mb-2">
                    লাইভ অটো-স্লাইডিং প্রিভিউ (Live Auto-Slide Preview):
                  </span>
                  <div
                    className="relative w-full overflow-hidden py-2.5 rounded-2xl shadow-xs transition-colors"
                    style={{
                      backgroundColor: settings.theme_announcement_bg || settings.theme_primary_color,
                      color: settings.theme_announcement_color || '#ffffff',
                    }}
                  >
                    {settings.theme_announcement_marquee === 'true' ? (
                      <div className="animate-marquee flex items-center will-change-transform select-none">
                        {/* Sequence 1 */}
                        <div className="flex items-center gap-8 shrink-0 px-4">
                          {[...Array(6)].map((_, i) => (
                            <div key={`live-m1-${i}`} className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide">
                              <Megaphone size={14} className="shrink-0 animate-pulse" />
                              <span>{settings.theme_announcement_text || 'নোটিশ টেক্সট লিখুন'}</span>
                              <span className="opacity-40 ml-4">•</span>
                            </div>
                          ))}
                        </div>
                        {/* Sequence 2 */}
                        <div className="flex items-center gap-8 shrink-0 px-4" aria-hidden="true">
                          {[...Array(6)].map((_, i) => (
                            <div key={`live-m2-${i}`} className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide">
                              <Megaphone size={14} className="shrink-0 animate-pulse" />
                              <span>{settings.theme_announcement_text || 'নোটিশ টেক্সট লিখুন'}</span>
                              <span className="opacity-40 ml-4">•</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs sm:text-sm font-bold px-4 flex items-center justify-center gap-2">
                        <Megaphone size={14} />
                        <span>{settings.theme_announcement_text || 'নোটিশ টেক্সট লিখুন'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Header Layout Style */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Layout size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  টপ হেডার নেভিগেশন স্টাইল (Header Layout)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  ওয়েবসাইটের শীর্ষ নেভিগেশন বারের উপস্থিতি ও ব্যাকগ্রাউন্ড নির্বাচন করুন
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  settings.theme_header_style === 'default'
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="radio"
                    name="header_style"
                    value="default"
                    checked={settings.theme_header_style === 'default'}
                    onChange={(e) => setSettings({ ...settings, theme_header_style: e.target.value })}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-slate-900 text-sm">Default Clean (White)</span>
                </div>
                <div className="h-12 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center px-4">
                  <div className="w-16 h-3 bg-slate-300 rounded"></div>
                  <div className="ml-auto flex gap-2">
                    <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                    <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  settings.theme_header_style === 'colored'
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="radio"
                    name="header_style"
                    value="colored"
                    checked={settings.theme_header_style === 'colored'}
                    onChange={(e) => setSettings({ ...settings, theme_header_style: e.target.value })}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-slate-900 text-sm">Brand Colored</span>
                </div>
                <div
                  className="h-12 rounded-xl shadow-xs border border-slate-200 flex items-center px-4"
                  style={{ backgroundColor: settings.theme_primary_color }}
                >
                  <div className="w-16 h-3 bg-white/70 rounded"></div>
                  <div className="ml-auto flex gap-2">
                    <div className="w-4 h-4 bg-white/70 rounded-full"></div>
                    <div className="w-4 h-4 bg-white/70 rounded-full"></div>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  settings.theme_header_style === 'floating'
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="radio"
                    name="header_style"
                    value="floating"
                    checked={settings.theme_header_style === 'floating'}
                    onChange={(e) => setSettings({ ...settings, theme_header_style: e.target.value })}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-slate-900 text-sm">Floating Island Pill</span>
                </div>
                <div className="h-12 bg-slate-100 rounded-xl flex items-center justify-center p-2">
                  <div className="w-full h-8 bg-white rounded-full shadow-sm border border-slate-200 flex items-center px-3">
                    <div className="w-10 h-2.5 bg-slate-300 rounded"></div>
                  </div>
                </div>
              </label>
            </div>

            {/* Sticky Header Option */}
            <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sticky Header (স্ক্রলে আটকে থাকা)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  পেজ নিচের দিকে স্ক্রোল করলেও হেডার মেনুবার উপরে ফিক্সড আটকে থাকবে
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.theme_header_sticky !== 'false'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme_header_sticky: e.target.checked ? 'true' : 'false',
                    })
                  }
                />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-pink-50 text-pink-600 rounded-2xl">
                <Smartphone size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  মোবাইল বটম ন্যাভিগেশন বার (Mobile Bottom Menu)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  স্মার্টফোন ব্যবহারকারীদের জন্য নিচের মেনুবারের স্টাইল
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  settings.theme_bottom_nav_style === 'default'
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="radio"
                    name="bottom_nav_style"
                    value="default"
                    checked={settings.theme_bottom_nav_style === 'default'}
                    onChange={(e) => setSettings({ ...settings, theme_bottom_nav_style: e.target.value })}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-slate-900 text-sm">Fixed Bottom Bar (ডিফল্ট)</span>
                </div>
                <div className="h-20 bg-slate-100 rounded-xl relative overflow-hidden flex items-end">
                  <div className="w-full h-10 bg-white border-t border-slate-200 flex justify-around items-center px-4">
                    <div className="w-5 h-5 bg-primary/40 rounded-full"></div>
                    <div className="w-5 h-5 bg-slate-300 rounded-full"></div>
                    <div className="w-5 h-5 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  settings.theme_bottom_nav_style === 'floating'
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="radio"
                    name="bottom_nav_style"
                    value="floating"
                    checked={settings.theme_bottom_nav_style === 'floating'}
                    onChange={(e) => setSettings({ ...settings, theme_bottom_nav_style: e.target.value })}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="font-bold text-slate-900 text-sm">Floating Island Pill</span>
                </div>
                <div className="h-20 bg-slate-100 rounded-xl relative overflow-hidden flex items-end p-2 justify-center">
                  <div className="w-[90%] h-10 bg-white border border-slate-200 rounded-full flex justify-around items-center px-4 shadow-md">
                    <div className="w-5 h-5 bg-primary/40 rounded-full"></div>
                    <div className="w-5 h-5 bg-slate-300 rounded-full"></div>
                    <div className="w-5 h-5 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 4: CARDS & BUTTONS */}
      {activeTab === 'components' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Product Card Style */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  প্রোডাক্ট কার্ড ডিজাইন আর্কিটেকচার (Product Cards)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  হোমপেজ ও শপ পেজে প্রোডাক্ট কার্ড কীভাবে প্রদর্শিত হবে তা নির্বাচন করুন
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CARD_STYLES.map((card) => {
                const isSelected = (settings.theme_card_style || 'modern-elevated') === card.id;
                return (
                  <label
                    key={card.id}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="card_style"
                          value={card.id}
                          checked={isSelected}
                          onChange={(e) => setSettings({ ...settings, theme_card_style: e.target.value })}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                        <span className="font-bold text-slate-900 text-sm">{card.name}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">{card.desc}</p>

                    {/* Mini Graphic Card Preview */}
                    <div
                      className={`p-3 bg-white ${
                        card.id === 'minimal-border'
                          ? 'border-2 border-slate-300'
                          : card.id === 'floating-glass'
                          ? 'border border-slate-200 shadow-md bg-white/90 backdrop-blur-sm'
                          : card.id === 'compact-retail'
                          ? 'border border-slate-200 shadow-none'
                          : 'border border-slate-200 shadow-sm'
                      }`}
                      style={{ borderRadius: settings.theme_radius || '16px' }}
                    >
                      <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center relative">
                        <span className="text-[10px] font-bold text-slate-400">PRODUCT IMAGE</span>
                        <span
                          className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white"
                          style={{ backgroundColor: settings.theme_secondary_color || '#10b981' }}
                        >
                          -20%
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs font-black text-primary">৳ 1,250</span>
                          <span
                            className="px-2 py-1 text-[10px] font-bold text-white rounded shadow-xs"
                            style={{
                              backgroundColor: settings.theme_primary_color,
                              borderRadius: settings.theme_button_style === 'pill' ? '9999px' : '6px',
                            }}
                          >
                            অর্ডার
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Button Style */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  বাটন ডিজাইন ও ইন্টারঅ্যাকশন (Button Styling)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  অর্ডার বাটন ও প্রধান অ্যাকশন বাটনসমূহের আকৃতি ও স্টাইল
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BUTTON_STYLES.map((btn) => {
                const isSelected = (settings.theme_button_style || 'solid') === btn.id;
                return (
                  <label
                    key={btn.id}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <input
                        type="radio"
                        name="btn_style"
                        value={btn.id}
                        checked={isSelected}
                        onChange={(e) => setSettings({ ...settings, theme_button_style: e.target.value })}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-bold text-slate-400 uppercase">{btn.id}</span>
                    </div>

                    <div className="mb-4 flex items-center justify-center">
                      <button
                        type="button"
                        className={`w-full py-2.5 px-3 text-xs font-black transition-all ${
                          btn.id === 'pill'
                            ? 'rounded-full bg-primary text-white shadow-xs'
                            : btn.id === 'gradient'
                            ? 'rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-xs'
                            : btn.id === 'outline'
                            ? 'rounded-xl border-2 border-primary bg-transparent text-primary'
                            : 'rounded-xl bg-primary text-white shadow-xs'
                        }`}
                        style={{
                          backgroundColor: btn.id === 'outline' ? 'transparent' : settings.theme_primary_color,
                          borderColor: settings.theme_primary_color,
                          color: btn.id === 'outline' ? settings.theme_primary_color : '#ffffff',
                        }}
                      >
                        অর্ডার করুন
                      </button>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-sm">{btn.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{btn.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Category & Footer Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Category Display Style */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900">ক্যাটাগরি ডিসপ্লে স্টাইল (Category Style)</h3>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                    settings.theme_category_style === 'grid' || !settings.theme_category_style
                      ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="cat_style"
                    value="grid"
                    checked={settings.theme_category_style === 'grid' || !settings.theme_category_style}
                    onChange={(e) => setSettings({ ...settings, theme_category_style: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-xs text-slate-800">Grid (গ্রিড)</div>
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square bg-slate-200 rounded"></div>
                    ))}
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                    settings.theme_category_style === 'slider'
                      ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="cat_style"
                    value="slider"
                    checked={settings.theme_category_style === 'slider'}
                    onChange={(e) => setSettings({ ...settings, theme_category_style: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-xs text-slate-800">Slider (স্লাইডার)</div>
                  <div className="flex gap-1.5 mt-3 overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                    ))}
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Style */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900">ফুটার কালার থিম (Footer Style)</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {['light', 'dark', 'colored'].map((style) => (
                  <label
                    key={style}
                    className={`cursor-pointer rounded-2xl border-2 p-3 text-center transition-all ${
                      (settings.theme_footer_style || 'light') === style
                        ? 'border-primary bg-primary/5 font-bold shadow-xs ring-2 ring-primary/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="footer_style"
                      value={style}
                      checked={(settings.theme_footer_style || 'light') === style}
                      onChange={(e) => setSettings({ ...settings, theme_footer_style: e.target.value })}
                      className="sr-only"
                    />
                    <div className="capitalize text-xs text-slate-800">{style}</div>
                    <div
                      className="h-8 rounded-lg mt-2 border border-slate-300"
                      style={{
                        backgroundColor:
                          style === 'dark'
                            ? '#0f172a'
                            : style === 'colored'
                            ? settings.theme_primary_color
                            : '#ffffff',
                      }}
                    ></div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preset JSON Modal */}
      <AnimatePresence>
        {jsonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sliders size={20} className="text-primary" />
                  <h3 className="font-black text-slate-900 text-lg">Theme Preset JSON</h3>
                </div>
                <button
                  onClick={() => setJsonModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                আপনার থিম সেটিংস কপি করে ব্যাকআপ রাখতে পারেন অথবা অন্য কোনো সাইট থেকে JSON পেস্ট করে এক ক্লিকে প্রয়োগ করতে পারেন।
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">JSON Configuration:</label>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Current Theme'}</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={jsonConfigInput || JSON.stringify(settings, null, 2)}
                  onChange={(e) => setJsonConfigInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-mono bg-slate-50 text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Paste Theme JSON configuration here..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setJsonModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportJSON}
                  disabled={!jsonConfigInput.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 shadow-md shadow-primary/20 cursor-pointer"
                >
                  Import Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
