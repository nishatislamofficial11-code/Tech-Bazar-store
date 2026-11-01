import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedData, setCachedData } from '../lib/cache';

interface SiteSettings {
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  site_logo?: string;
  site_favicon?: string;
  siteName?: string;
  siteDescription?: string;
  siteKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterHandle?: string;
  cloudinary_cloud_name?: string;
  cloudinary_upload_preset?: string;
  gtm_id?: string;
  fb_pixel_id?: string;
  fb_pixel_access_token?: string;
  fb_pixel_test_event_code?: string;
  tiktok_pixel_id?: string;
  tiktok_access_token?: string;
  tiktok_test_event_code?: string;
  allow_guest_checkout?: string;
  whatsapp_number?: string;
  product_whatsapp_enabled?: string;
  floating_whatsapp_enabled?: string;
  call_order_enabled?: string;
  call_order_number?: string;
  delivery_charge_type?: string;
  flat_delivery_charge?: string;
  delivery_charge_inside_dhaka?: string;
  delivery_charge_outside_dhaka?: string;
  district_delivery_rates?: string;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_bg_tone?: string;
  theme_font_family?: string;
  theme_radius?: string;
  theme_card_style?: string;
  theme_button_style?: string;
  theme_header_style?: string;
  theme_header_sticky?: string;
  theme_bottom_nav_style?: string;
  theme_category_style?: string;
  theme_footer_style?: string;
  theme_announcement_enabled?: string;
  theme_announcement_text?: string;
  theme_announcement_marquee?: string;
  theme_announcement_bg?: string;
  theme_announcement_color?: string;
  theme_announcement_link?: string;
  active_theme?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_notifications_enabled?: string;
  telegram_bots?: string;
}

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  loading: true,
  refreshSettings: async () => {}
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const cached = getCachedData('site_settings_cache');
    return (cached && typeof cached === 'object' && !Array.isArray(cached)) ? cached : {};
  });
  const [loading, setLoading] = useState(Object.keys(settings).length === 0);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (!error && data) {
        const newSettings: any = {
          allow_guest_checkout: 'true' // Default to true for new websites
        };
        data.forEach((item) => {
          newSettings[item.key] = item.value;
        });
        setSettings(newSettings);
        setCachedData('site_settings_cache', newSettings, 120); // 2 hours ttl

        // Update favicon if set
        if (newSettings.site_favicon) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = newSettings.site_favicon;
        }
      }
    } catch (err) {
      console.error('Error fetching site settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
