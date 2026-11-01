import { getAllDistricts, BD_DIVISIONS, parseDistrictDeliveryRates } from '../../data/bangladeshData';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Save, Settings, Send, Zap, Plus, Trash2, Bot, Search, Image as ImageIcon, Smartphone, QrCode, Copy, Check, ShieldCheck, Download } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { motion } from 'framer-motion';
import { useSettings } from '../../contexts/SettingsContext';
import { sendTelegramMessage, autoFetchTelegramChatId, TelegramBotItem, parseTelegramBots } from '../../lib/telegramApi';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'social', label: 'Social Media' },
  { id: 'contact', label: 'Contact & WhatsApp' },
  { id: 'delivery', label: 'Checkout & Delivery' },
  { id: 'telegram', label: 'Telegram Notifications' },
  { id: 'mobile_app', label: '📱 Mobile App Connect' },
];

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState(false);
  const { refreshSettings } = useSettings();
  
  const [activeTab, setActiveTab] = useState('general');

  const [telegramBots, setTelegramBots] = useState<TelegramBotItem[]>([
    { id: 'bot-1', name: 'Bot #1 (Main)', bot_token: '', chat_id: '' }
  ]);

  const [settings, setSettings] = useState({
    facebook_url: '',
    instagram_url: '',
    youtube_url: '',
    site_logo: '',
    site_favicon: '',
    copyright_text: '',
    allow_guest_checkout: 'true',
    whatsapp_number: '',
    product_whatsapp_enabled: 'false',
    floating_whatsapp_enabled: 'false',
    call_order_enabled: 'true',
    call_order_number: '',
    delivery_charge_type: 'inside_outside',
    flat_delivery_charge: '120',
    delivery_charge_inside_dhaka: '0',
    delivery_charge_outside_dhaka: '0',
    district_delivery_rates: '{}',
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_notifications_enabled: 'false',
    cloudinary_cloud_name: '',
    cloudinary_upload_preset: ''
  });

  const [copiedToken, setCopiedToken] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('all');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const storeName = settings.copyright_text || (typeof window !== 'undefined' ? window.location.hostname.replace(/^www\./i, '') : 'My Store');

  const mobileAppToken = React.useMemo(() => {
    try {
      const payload = {
        name: storeName,
        url: supabaseUrl,
        key: supabaseAnonKey,
      };
      return 'STORE_' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    } catch {
      return '';
    }
  }, [storeName, supabaseUrl, supabaseAnonKey]);

  const handleCopyToken = () => {
    if (!mobileAppToken) return;
    navigator.clipboard.writeText(mobileAppToken);
    setCopiedToken(true);
    toast.success('Store Connect Token copied to clipboard!');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('settings').select('*');
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('schema cache') || error.message.includes('relation "public.settings" does not exist')) {
          setDbError(true);
        } else {
          toast.error(`Failed to load settings: ${error.message}`);
        }
      } else if (data) {
        const newSettings = { ...settings };
        let rawTelegramBots: string | undefined;
        let rawBotToken: string | undefined;
        let rawChatId: string | undefined;

        data.forEach((item) => {
          (newSettings as any)[item.key] = item.value;
          if (item.key === 'telegram_bots') rawTelegramBots = item.value;
          if (item.key === 'telegram_bot_token') rawBotToken = item.value;
          if (item.key === 'telegram_chat_id') rawChatId = item.value;
        });

        const parsedBots = parseTelegramBots(rawTelegramBots, rawBotToken, rawChatId);
        setTelegramBots(parsedBots);
        setSettings(newSettings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTelegramBot = () => {
    const nextNum = telegramBots.length + 1;
    setTelegramBots((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `Bot #${nextNum}`,
        bot_token: '',
        chat_id: ''
      }
    ]);
  };

  const removeTelegramBot = (id: string) => {
    if (telegramBots.length <= 1) {
      setTelegramBots([{ id: 'bot-1', name: 'Bot #1 (Main)', bot_token: '', chat_id: '' }]);
      return;
    }
    setTelegramBots((prev) => prev.filter((b) => b.id !== id));
  };

  const updateTelegramBot = (id: string, field: keyof TelegramBotItem, value: string) => {
    setTelegramBots((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleTestSpecificBot = async (bot: TelegramBotItem) => {
    const token = bot.bot_token.trim();
    const chatId = bot.chat_id.trim();
    const botName = bot.name || 'Telegram Bot';

    if (!token || !chatId) {
      toast.error(`Please enter both Bot Token and Chat ID for ${botName}!`);
      return;
    }

    if (chatId.startsWith('@')) {
      toast.error('Chat ID must be numeric (e.g. 6698628664) not a username', { duration: 7000 });
      return;
    }

    const toastId = `tg-test-${bot.id}`;
    toast.loading(`Sending test message to ${botName}...`, { id: toastId });
    const res = await sendTelegramMessage(
      token,
      chatId,
      `<b>🔔 TEST MESSAGE: ${botName.toUpperCase()}</b>\n\nYour Telegram Order Notification bot is connected and working perfectly! ✅`
    );
    if (res.ok) {
      toast.success(`Test message sent successfully to ${botName}!`, { id: toastId });
    } else {
      toast.error(`Telegram error (${botName}): ${res.error || 'Check Bot Token & Chat ID!'}`, { id: toastId, duration: 7000 });
    }
  };

  const handleTestAllBots = async () => {
    const activeBots = telegramBots.filter((b) => b.bot_token.trim() && b.chat_id.trim());
    if (activeBots.length === 0) {
      toast.error('Please configure at least one Bot Token and Chat ID first!');
      return;
    }

    toast.loading(`Testing ${activeBots.length} Telegram Bot(s)...`, { id: 'tg-test-all' });
    const results = await Promise.all(
      activeBots.map((bot) =>
        sendTelegramMessage(
          bot.bot_token.trim(),
          bot.chat_id.trim(),
          `<b>🔔 TELEGRAM ORDER BOT TEST</b>\n\nBot Name: <b>${bot.name || 'Telegram Bot'}</b>\nStatus: Connected & ready for instant notifications! 🚀`
        )
      )
    );

    const successCount = results.filter((r) => r.ok).length;
    if (successCount === activeBots.length) {
      toast.success(`All ${activeBots.length} bot(s) received test messages successfully! ✅`, { id: 'tg-test-all' });
    } else if (successCount > 0) {
      toast.success(`${successCount} of ${activeBots.length} bots connected successfully. Please check the failed ones!`, { id: 'tg-test-all' });
    } else {
      toast.error('Failed to send test messages. Please check your Bot Tokens and Chat IDs.', { id: 'tg-test-all' });
    }
  };

  const handleAutoFetchChatIdForBot = async (botId: string) => {
    const bot = telegramBots.find((b) => b.id === botId);
    const token = bot?.bot_token.trim();
    if (!token) {
      toast.error('Please enter Bot Token first!');
      return;
    }

    const toastId = `tg-fetch-${botId}`;
    toast.loading('Detecting Telegram Chat ID automatically...', { id: toastId });
    const res = await autoFetchTelegramChatId(token);
    if (res.ok && res.chatId) {
      updateTelegramBot(botId, 'chat_id', res.chatId);
      toast.success(`Chat ID (${res.chatId}) auto-detected and filled!`, { id: toastId, duration: 5000 });
    } else {
      toast.error(res.error || 'Failed to detect Chat ID. Send a /start message to your bot on Telegram first!', { id: toastId, duration: 7000 });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    
    try {
      const primaryBot = telegramBots[0] || { bot_token: '', chat_id: '' };
      const settingsToSave = {
        ...settings,
        telegram_bots: JSON.stringify(telegramBots),
        telegram_bot_token: primaryBot.bot_token || '',
        telegram_chat_id: primaryBot.chat_id || ''
      };
      
      const rows = Object.entries(settingsToSave).map(([key, value]) => ({
        key,
        value: String(value ?? '')
      }));

      const { error: upsertError } = await supabase
        .from('settings')
        .upsert(rows, { onConflict: 'key' });

      if (upsertError) {
        // Fallback to individual updates if upsert has an issue
        for (const { key, value } of rows) {
          const { data: existing } = await supabase
            .from('settings')
            .select('id')
            .eq('key', key)
            .maybeSingle();

          if (existing) {
            await supabase.from('settings').update({ value }).eq('key', key);
          } else {
            await supabase.from('settings').insert([{ key, value }]);
          }
        }
      }
      
      setSettings(settingsToSave);
      toast.success('Settings saved successfully');
      await refreshSettings();
    } catch (err: any) {
      toast.error(`Failed to save settings: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const initDbSql = `
CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins full access settings" ON public.settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
`;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="pb-12 max-w-5xl mx-auto font-sans"
    >
      {/* Top Header & Tabs (Untitled UI Style) */}
      <div className="flex flex-col gap-6 mb-8 px-4 sm:px-0 pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h1 className="text-2xl sm:text-[30px] font-semibold text-gray-900 tracking-tight">Settings</h1>
           <div className="relative w-full sm:w-auto">
             <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="Search settings..." 
               className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-full sm:w-[280px] shadow-sm transition-all outline-none" 
             />
           </div>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar">
           <nav className="flex space-x-1 sm:space-x-2 border-b border-gray-200 w-full" aria-label="Tabs">
             {tabs.map(tab => {
               const isActive = activeTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
                   className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none ${
                     isActive 
                     ? 'border-primary text-primary' 
                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                   }`}
                 >
                   {tab.label}
                 </button>
               );
             })}
           </nav>
        </div>
      </div>

      {dbError ? (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md mx-4 sm:mx-0">
          <h3 className="text-lg font-bold text-orange-800 mb-2">Database Setup Required</h3>
          <p className="text-orange-700 mb-4">To enable settings management, please run this SQL query in your Supabase SQL Editor:</p>
          <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
            {initDbSql}
          </pre>
          <button 
            onClick={() => { setDbError(false); fetchSettings(); }}
            className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium"
          >
            I've run the SQL, Check Again
          </button>
        </div>
      ) : loading ? (
        <motion.div variants={item} className="py-12">
          <LoadingSpinner message="Loading settings..." />
        </motion.div>
      ) : (
        <motion.form variants={item} onSubmit={handleSave} className="space-y-8 px-4 sm:px-0">
           
           {/* Section Header with Actions */}
           <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-200 pb-5">
             <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {activeTab === 'general' && 'Update your site branding, copyright, and image storage config.'}
                  {activeTab === 'social' && 'Update your social media links for the website footer.'}
                  {activeTab === 'contact' && 'Manage WhatsApp and phone order settings.'}
                  {activeTab === 'delivery' && 'Configure delivery charges and checkout rules.'}
                  {activeTab === 'telegram' && 'Add multiple bots to receive instant order notifications.'}
                  {activeTab === 'mobile_app' && 'Connect and sync your store with the Android Admin mobile application.'}
                </p>
             </div>
             {activeTab !== 'mobile_app' && (
               <div className="flex items-center gap-3 shrink-0">
                  <button type="button" onClick={() => fetchSettings()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-lg shadow-sm hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
               </div>
             )}
           </div>

           {/* Form Content Area */}
           <div className="space-y-1 divide-y divide-gray-200">
             
             {/* ================= GENERAL TAB ================= */}
             {activeTab === 'general' && (
               <>
                 {/* Site Logo */}
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Site Logo</label>
                      <p className="text-sm text-gray-500 mt-1">This will be displayed on the navbar.</p>
                   </div>
                   <div className="md:w-2/3 max-w-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        {settings.site_logo ? (
                          <div className="w-16 h-16 rounded-full border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center bg-gray-50">
                            <img src={settings.site_logo} alt="Logo" className="w-full h-full object-contain p-2" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                             <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 w-full max-w-sm">
                          <CloudinaryUpload
                            label=""
                            value={settings.site_logo}
                            onChange={(url) => setSettings({ ...settings, site_logo: url })}
                          />
                        </div>
                      </div>
                   </div>
                 </div>

                 {/* Site Favicon */}
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Site Favicon</label>
                      <p className="text-sm text-gray-500 mt-1">Small icon displayed in browser tabs.</p>
                   </div>
                   <div className="md:w-2/3 max-w-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        {settings.site_favicon ? (
                          <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center bg-gray-50">
                            <img src={settings.site_favicon} alt="Favicon" className="w-full h-full object-contain p-1" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                             <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 w-full max-w-sm">
                          <CloudinaryUpload
                            label=""
                            value={settings.site_favicon}
                            onChange={(url) => setSettings({ ...settings, site_favicon: url })}
                          />
                        </div>
                      </div>
                   </div>
                 </div>

                 {/* Copyright Text */}
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Copyright Text</label>
                      <p className="text-sm text-gray-500 mt-1">Text displayed at the very bottom of the site.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <input 
                        type="text" 
                        value={settings.copyright_text} 
                        onChange={(e) => setSettings({...settings, copyright_text: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="© 2026 Your Store Name. All rights reserved."
                      />
                   </div>
                 </div>

                 {/* Cloudinary Config */}
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Cloudinary Config</label>
                      <p className="text-sm text-gray-500 mt-1">Configure unsigned upload settings.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg space-y-4">
                      <div>
                        <input 
                          type="text" 
                          value={settings.cloudinary_cloud_name} 
                          onChange={(e) => setSettings({...settings, cloudinary_cloud_name: e.target.value})}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="Cloud Name (e.g. dxyz123)"
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          value={settings.cloudinary_upload_preset} 
                          onChange={(e) => setSettings({...settings, cloudinary_upload_preset: e.target.value})}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="Upload Preset (Unsigned)"
                        />
                      </div>
                   </div>
                 </div>
               </>
             )}


             {/* ================= SOCIAL MEDIA TAB ================= */}
             {activeTab === 'social' && (
               <>
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Facebook URL</label>
                      <p className="text-sm text-gray-500 mt-1">Your official Facebook page.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <input 
                        type="url" 
                        value={settings.facebook_url} 
                        onChange={(e) => setSettings({...settings, facebook_url: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="https://facebook.com/yourpage"
                      />
                   </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Instagram URL</label>
                      <p className="text-sm text-gray-500 mt-1">Your official Instagram profile.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <input 
                        type="url" 
                        value={settings.instagram_url} 
                        onChange={(e) => setSettings({...settings, instagram_url: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="https://instagram.com/yourprofile"
                      />
                   </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">YouTube URL</label>
                      <p className="text-sm text-gray-500 mt-1">Your official YouTube channel.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <input 
                        type="url" 
                        value={settings.youtube_url} 
                        onChange={(e) => setSettings({...settings, youtube_url: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="https://youtube.com/@yourchannel"
                      />
                   </div>
                 </div>
               </>
             )}


             {/* ================= CONTACT & WHATSAPP TAB ================= */}
             {activeTab === 'contact' && (
               <>
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">WhatsApp Number</label>
                      <p className="text-sm text-gray-500 mt-1">Primary number for WhatsApp chats.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <input 
                        type="tel" 
                        value={settings.whatsapp_number} 
                        onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="88017XXXXXXXX"
                      />
                   </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">WhatsApp Features</label>
                      <p className="text-sm text-gray-500 mt-1">Enable or disable WhatsApp shortcuts.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg space-y-4">
                      <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.product_whatsapp_enabled === 'true'}
                          onChange={(e) => setSettings({...settings, product_whatsapp_enabled: e.target.checked ? 'true' : 'false'})}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>
                          <span className="block text-sm font-medium text-gray-900">Product Details Button</span>
                          <span className="block text-sm text-gray-500 mt-0.5">Show WhatsApp button directly on product pages.</span>
                        </span>
                      </label>

                      <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.floating_whatsapp_enabled === 'true'}
                          onChange={(e) => setSettings({...settings, floating_whatsapp_enabled: e.target.checked ? 'true' : 'false'})}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>
                          <span className="block text-sm font-medium text-gray-900">Floating WhatsApp</span>
                          <span className="block text-sm text-gray-500 mt-0.5">Show floating WhatsApp widget globally.</span>
                        </span>
                      </label>
                   </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Call Order</label>
                      <p className="text-sm text-gray-500 mt-1">Settings for direct phone call orders.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg space-y-4">
                      <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.call_order_enabled === 'true'}
                          onChange={(e) => setSettings({...settings, call_order_enabled: e.target.checked ? 'true' : 'false'})}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>
                          <span className="block text-sm font-medium text-gray-900">Product Call Order Button</span>
                          <span className="block text-sm text-gray-500 mt-0.5">Show call button on product details page.</span>
                        </span>
                      </label>
                      <div>
                        <input 
                          type="tel" 
                          value={settings.call_order_number} 
                          onChange={(e) => setSettings({...settings, call_order_number: e.target.value})}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="Phone number for orders (e.g. 019XXXXXXXX)"
                        />
                      </div>
                   </div>
                 </div>
               </>
             )}


             {/* ================= DELIVERY TAB ================= */}
             {activeTab === 'delivery' && (
               <>
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Guest Checkout</label>
                      <p className="text-sm text-gray-500 mt-1">Allow customers to buy without an account.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.allow_guest_checkout === 'true'} 
                          onChange={(e) => setSettings({...settings, allow_guest_checkout: e.target.checked ? 'true' : 'false'})}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-900">Enable Guest Checkout</span>
                      </label>
                   </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Delivery Charge Type</label>
                      <p className="text-sm text-gray-500 mt-1">How delivery fees are calculated.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="inside_outside"
                            checked={settings.delivery_charge_type !== 'flat'}
                            onChange={(e) => setSettings({...settings, delivery_charge_type: e.target.value})}
                            className="text-primary focus:ring-primary w-4 h-4 border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-900">Inside/Outside Dhaka</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="flat"
                            checked={settings.delivery_charge_type === 'flat'}
                            onChange={(e) => setSettings({...settings, delivery_charge_type: e.target.value})}
                            className="text-primary focus:ring-primary w-4 h-4 border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-900">Flat Charge</span>
                        </label>
                      </div>
                   </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Delivery Rates (৳)</label>
                      <p className="text-sm text-gray-500 mt-1">Set the applicable amounts.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      {settings.delivery_charge_type === 'flat' ? (
                        <div>
                          <input
                            type="number"
                            min="0"
                            value={settings.flat_delivery_charge}
                            onChange={(e) => setSettings({...settings, flat_delivery_charge: e.target.value})}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="e.g. 120"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Inside Dhaka</label>
                            <input
                              type="number"
                              min="0"
                              value={settings.delivery_charge_inside_dhaka}
                              onChange={(e) => setSettings({...settings, delivery_charge_inside_dhaka: e.target.value})}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="e.g. 60"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Outside Dhaka</label>
                            <input
                              type="number"
                              min="0"
                              value={settings.delivery_charge_outside_dhaka}
                              onChange={(e) => setSettings({...settings, delivery_charge_outside_dhaka: e.target.value})}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="e.g. 120"
                            />
                          </div>
                        </div>
                      )}
                   </div>
                 </div>

                 {/* District-wise Custom Delivery Charges */}
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6 border-t border-gray-100">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">District-wise Delivery Charges (ঐচ্ছিক)</label>
                      <p className="text-sm text-gray-500 mt-1">
                        যেকোনো নির্দিষ্ট জেলার জন্য আলাদা ডেলিভারি চার্জ নির্ধারণ করুন। ফাঁকা রাখলে সাধারণ Inside/Outside Dhaka চার্জ প্রযোজ্য হবে।
                      </p>
                   </div>
                   <div className="md:w-2/3 max-w-2xl">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={districtSearch}
                            onChange={(e) => setDistrictSearch(e.target.value)}
                            placeholder="জেলা খুঁজুন (e.g. চট্টগ্রাম, Sylhet, Bogura)..."
                            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <select
                            value={selectedDivisionFilter}
                            onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          >
                            <option value="all">সব বিভাগ (All Divisions)</option>
                            {BD_DIVISIONS.map(d => (
                              <option key={d.id} value={d.id}>{d.nameBn} ({d.name})</option>
                            ))}
                          </select>
                        </div>

                        {/* District rates list */}
                        {(() => {
                          const customRates = parseDistrictDeliveryRates(settings.district_delivery_rates);
                          const allDistricts = getAllDistricts().filter(dist => {
                            if (selectedDivisionFilter !== 'all' && dist.divisionId !== selectedDivisionFilter) return false;
                            if (districtSearch.trim()) {
                              const q = districtSearch.toLowerCase().trim();
                              return dist.name.toLowerCase().includes(q) || dist.nameBn.includes(q) || dist.id.includes(q);
                            }
                            return true;
                          });

                          const handleDistrictRateChange = (districtId: string, value: string) => {
                            const updated = { ...customRates };
                            const trimmed = value.trim();
                            if (trimmed === '' || isNaN(Number(trimmed))) {
                              delete updated[districtId.toLowerCase()];
                            } else {
                              updated[districtId.toLowerCase()] = Math.max(0, Number(trimmed));
                            }
                            setSettings({
                              ...settings,
                              district_delivery_rates: JSON.stringify(updated)
                            });
                          };

                          const customCount = Object.keys(customRates).length;

                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs text-gray-500 font-medium px-1">
                                <span>দেখাচ্ছে: {allDistricts.length} টি জেলা {customCount > 0 && <span className="text-primary font-bold">({customCount} টিতে কাস্টম রেট সেট করা আছে)</span>}</span>
                                {customCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, district_delivery_rates: '{}' })}
                                    className="text-red-600 hover:text-red-700 font-bold underline"
                                  >
                                    কাস্টম চার্জ মুছুন
                                  </button>
                                )}
                              </div>

                              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {allDistricts.length === 0 ? (
                                  <p className="text-center py-6 text-xs text-gray-400">কোনো জেলা পাওয়া যায়নি</p>
                                ) : (
                                  allDistricts.map(dist => {
                                    const customVal = customRates[dist.id] !== undefined ? customRates[dist.id] : '';
                                    const defaultRate = dist.isInsideDhaka
                                      ? Number(settings.delivery_charge_inside_dhaka || 80)
                                      : Number(settings.delivery_charge_outside_dhaka || 150);

                                    return (
                                      <div key={dist.id} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-gray-200">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-gray-900">{dist.nameBn}</span>
                                            <span className="text-xs text-gray-500">({dist.name})</span>
                                          </div>
                                          <p className="text-[11px] text-gray-400">
                                            বিভাগ: {dist.divisionNameBn} • ডিফল্ট: ৳{defaultRate}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-xs font-bold text-gray-400">৳</span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={customVal}
                                            onChange={(e) => handleDistrictRateChange(dist.id, e.target.value)}
                                            placeholder={`ডিফল্ট (${defaultRate})`}
                                            className="w-28 bg-gray-50 border border-gray-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                   </div>
                 </div>
               </>
             )}


             {/* ================= TELEGRAM TAB ================= */}
             {activeTab === 'telegram' && (
               <>
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0">
                      <label className="block text-sm font-medium text-gray-900">Master Switch</label>
                      <p className="text-sm text-gray-500 mt-1">Enable instant notifications for new orders.</p>
                   </div>
                   <div className="md:w-2/3 max-w-lg">
                      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={settings.telegram_notifications_enabled === 'true'} 
                            onChange={(e) => setSettings({...settings, telegram_notifications_enabled: e.target.checked ? 'true' : 'false'})}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-semibold text-gray-900">Enable Bot Notifications</span>
                        </label>
                        <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded">
                          {telegramBots.length} Configured
                        </span>
                      </div>
                      
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleTestAllBots}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                        >
                          <Send size={14} /> Test All Bots
                        </button>
                      </div>
                   </div>
                 </div>

                 {/* Bot List */}
                 {telegramBots.map((bot, index) => (
                   <div key={bot.id} className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                     <div className="md:w-1/3 shrink-0">
                        <label className="block text-sm font-medium text-gray-900">Bot #{index + 1}</label>
                        <p className="text-sm text-gray-500 mt-1">Credentials for Bot #{index + 1}</p>
                     </div>
                     <div className="md:w-2/3 max-w-lg space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={bot.name}
                            onChange={(e) => updateTelegramBot(bot.id, 'name', e.target.value)}
                            placeholder="Bot Name"
                            className="flex-1 bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleTestSpecificBot(bot)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                            title="Test this bot"
                          >
                            Test
                          </button>
                          {telegramBots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTelegramBot(bot.id)}
                              className="p-2 bg-white border border-gray-300 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-colors"
                              title="Remove bot"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Bot Token</label>
                           <input
                             type="text"
                             value={bot.bot_token}
                             onChange={(e) => updateTelegramBot(bot.id, 'bot_token', e.target.value)}
                             className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                             placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                           />
                        </div>

                        <div>
                           <div className="flex items-center justify-between mb-1">
                             <label className="block text-xs font-medium text-gray-500">Chat ID</label>
                             <button
                               type="button"
                               onClick={() => handleAutoFetchChatIdForBot(bot.id)}
                               className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1"
                             >
                               <Zap size={12} /> Auto Detect
                             </button>
                           </div>
                           <input
                             type="text"
                             value={bot.chat_id}
                             onChange={(e) => updateTelegramBot(bot.id, 'chat_id', e.target.value)}
                             className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                             placeholder="6698628664"
                           />
                        </div>
                     </div>
                   </div>
                 ))}

                 {/* Add Bot Row */}
                 <div className="flex flex-col md:flex-row gap-4 md:gap-8 py-6">
                   <div className="md:w-1/3 shrink-0"></div>
                   <div className="md:w-2/3 max-w-lg">
                      <button
                        type="button"
                        onClick={addTelegramBot}
                        className="w-full py-3 px-4 border border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 rounded-lg text-gray-600 hover:text-primary font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Plus size={16} /> Add Another Telegram Bot
                      </button>
                   </div>
                 </div>
               </>
             )}

             {/* ================= MOBILE APP CONNECT TAB ================= */}
             {activeTab === 'mobile_app' && (
               <div className="py-6 space-y-8">
                 {/* Banner */}
                 <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="space-y-2 text-center md:text-left">
                     <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                       <Smartphone className="w-3.5 h-3.5" />
                       Universal Admin App
                     </div>
                     <h3 className="text-xl sm:text-2xl font-bold">1-Click Mobile App Connect</h3>
                     <p className="text-blue-100 text-sm max-w-xl">
                       Open the <strong>Store Admin App</strong> on your Android phone, tap <em>Scan QR</em>, and point your camera at this QR code. Your store will instantly sync!
                     </p>
                   </div>
                   <a
                     href="/StoreAdminApp.apk"
                     download="StoreAdminApp.apk"
                     className="shrink-0 inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-blue-50 font-semibold px-5 py-3 rounded-xl shadow-sm transition-all"
                   >
                     <Download className="w-5 h-5" />
                     Download APK (v1.0)
                   </a>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                   {/* Left: QR Code Box */}
                   <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                     <div className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                       <QrCode className="w-4 h-4 text-primary" />
                       Scan from Admin App
                     </div>

                     {mobileAppToken ? (
                       <div className="p-3 bg-white rounded-2xl border-2 border-indigo-100 shadow-inner inline-block">
                         <img
                           src={'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=' + encodeURIComponent(mobileAppToken)}
                           alt="Mobile Connect QR Code"
                           className="w-56 h-56 rounded-xl"
                           loading="lazy"
                         />
                       </div>
                     ) : (
                       <div className="w-56 h-56 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400 p-4">
                         Database credentials not configured
                       </div>
                     )}

                     <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                       <ShieldCheck className="w-4 h-4" />
                       Encrypted Store Credentials
                     </div>
                   </div>

                   {/* Right: Token & Manual Setup */}
                   <div className="lg:col-span-7 space-y-6">
                     <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                       <div>
                         <label className="block text-sm font-bold text-gray-900 mb-1">
                           Store Connect Token
                         </label>
                         <p className="text-xs text-gray-500 mb-3">
                           If you cannot scan the QR code, copy this token and paste it into the mobile app's <strong>"Paste Store Token"</strong> field.
                         </p>
                         <div className="relative">
                           <textarea
                             readOnly
                             rows={3}
                             value={mobileAppToken}
                             className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-mono text-gray-700 focus:outline-none select-all"
                           />
                           <button
                             type="button"
                             onClick={handleCopyToken}
                             className="absolute top-2 right-2 inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:border-primary text-gray-700 hover:text-primary px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                           >
                             {copiedToken ? (
                               <>
                                 <Check className="w-3.5 h-3.5 text-emerald-600" />
                                 <span className="text-emerald-600">Copied!</span>
                               </>
                             ) : (
                               <>
                                 <Copy className="w-3.5 h-3.5" />
                                 <span>Copy Token</span>
                               </>
                             )}
                           </button>
                         </div>
                       </div>

                       <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-600">
                         <div className="flex justify-between items-center py-1">
                           <span className="font-semibold text-gray-700">Active Database URL:</span>
                           <span className="font-mono text-gray-500 truncate max-w-[240px] sm:max-w-[320px]">{supabaseUrl || 'N/A'}</span>
                         </div>
                         <div className="flex justify-between items-center py-1">
                           <span className="font-semibold text-gray-700">Store Name:</span>
                           <span className="text-gray-900 font-medium">{storeName}</span>
                         </div>
                       </div>
                     </div>

                     {/* 3 Step Guide */}
                     <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">How to Connect in 3 Steps:</h4>
                       <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
                         <li>Install and open <strong>Store Admin App</strong> on your Android device.</li>
                         <li>Scan the QR code above or paste the <strong>Store Connect Token</strong>.</li>
                         <li>Login with your admin email and password. Your orders, products, and analytics will instantly load!</li>
                       </ol>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>
        </motion.form>
      )}
    </motion.div>
  );
}
