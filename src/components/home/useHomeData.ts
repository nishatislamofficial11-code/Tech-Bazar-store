// Shared data for the home page designs (banners, featured categories, store features).
// Uses the same cache keys as the classic home sections, so switching designs costs no extra loading.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getCachedData, setCachedData } from '../../lib/cache';

function useCachedQuery<T>(cacheKey: string, ttlMinutes: number, load: () => Promise<T[] | null>) {
  const [rows, setRows] = useState<T[]>(() => {
    const cached = getCachedData(cacheKey);
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(rows.length === 0);
  useEffect(() => {
    let alive = true;
    load()
      .then((data) => {
        if (!alive || !data) return;
        setRows(data);
        setCachedData(cacheKey, data, ttlMinutes);
      })
      .catch(() => null)
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);
  return { rows, loading };
}

export interface HomeBanner { id: string; image_url: string; link_url?: string | null; title?: string }
export interface HomeCategory { id: string; name: string; image_url?: string | null }
export interface StoreFeature { icon: string; title: string; desc: string; enabled?: boolean }

export const useBanners = () =>
  useCachedQuery<HomeBanner>('home_banners_cache', 60, async () => {
    const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('created_at', { ascending: false });
    return data?.length ? data : null;
  });

export const useFeaturedCategories = () =>
  useCachedQuery<HomeCategory>('categories_cache', 5, async () => {
    const { data } = await supabase.from('categories').select('*').eq('is_featured', true).order('created_at', { ascending: false }).limit(10);
    return data || null;
  });

const DEFAULT_FEATURES: StoreFeature[] = [
  { icon: 'Truck', title: 'দ্রুত ডেলিভারি', desc: 'সারা বাংলাদেশে' },
  { icon: 'ShieldCheck', title: 'ক্যাশ অন ডেলিভারি', desc: 'পণ্য হাতে পেয়ে টাকা' },
  { icon: 'RotateCcw', title: 'সহজ রিটার্ন', desc: 'ঝামেলা ছাড়া এক্সচেঞ্জ' },
  { icon: 'Headset', title: 'সাপোর্ট', desc: 'কল ও চ্যাট' },
];

export const useStoreFeatures = () =>
  useCachedQuery<StoreFeature>('store_features_cache', 30, async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'store_features').maybeSingle();
    if (!data?.value) return DEFAULT_FEATURES;
    try {
      const list = (JSON.parse(data.value) as StoreFeature[]).filter((f) => f.enabled);
      return list;
    } catch {
      return DEFAULT_FEATURES;
    }
  });

export const categoryPath = (name: string) =>
  `/category/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}`;
