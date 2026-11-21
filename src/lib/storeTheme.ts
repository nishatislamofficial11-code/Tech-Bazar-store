// Store themes. A theme changes how the shop looks (home page, header, bottom menu, footer,
// product cards); orders, cart and checkout work the same in every theme.
import { useSettings } from '../contexts/SettingsContext';

export type StoreThemeId = 'classic' | 'fashion';

export interface StoreThemeInfo {
  id: StoreThemeId;
  name: string;
  desc: string;
  preview: string;
  /** Colours set when the theme is applied (the shop can change them later). */
  colors: Record<string, string>;
  /** Banner sizes this theme is designed for. */
  bannerSizes: { hero: string; middle?: string };
}

export const STORE_THEMES: StoreThemeInfo[] = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'ব্যানার স্লাইডার, গোল ক্যাটাগরি, ফ্ল্যাশ সেল — সব ধরনের দোকানের জন্য',
    preview: '/themes/classic.jpg',
    colors: { theme_primary_color: '#0066ff', theme_secondary_color: '#10b981', theme_bg_tone: '#f8fafc', theme_announcement_bg: '#0066ff' },
    bannerSizes: { hero: '1200 × 480 px' },
  },
  {
    id: 'fashion',
    name: 'Fashion',
    desc: 'বড় ছবির ক্যাটাগরি, স্লাইড করা প্রোডাক্ট, রিভিউ — পোশাক, বিউটি, লাইফস্টাইল',
    preview: '/themes/fashion.jpg',
    colors: { theme_primary_color: '#0f6b5b', theme_secondary_color: '#e11d48', theme_bg_tone: '#ffffff', theme_announcement_bg: '#0f6b5b' },
    bannerSizes: { hero: '1200 × 560 px', middle: '1200 × 560 px' },
  },
];

export function themeIdOf(active?: string | null): StoreThemeId {
  return active === 'fashion' ? 'fashion' : 'classic';
}

const PREVIEW_KEY = 'preview_theme';

/** A theme being previewed in this browser tab (Admin → Themes → Preview), if any. */
export function previewThemeId(): StoreThemeId | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(PREVIEW_KEY);
    if (fromUrl) sessionStorage.setItem(PREVIEW_KEY, fromUrl);
    const v = sessionStorage.getItem(PREVIEW_KEY);
    return v ? themeIdOf(v) : null;
  } catch {
    return null;
  }
}

export function endThemePreview() {
  try { sessionStorage.removeItem(PREVIEW_KEY); } catch { /* ignore */ }
}

export function useStoreTheme(): StoreThemeId {
  const { settings } = useSettings();
  return previewThemeId() ?? themeIdOf(settings?.active_theme);
}
