import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';
import { getCachedData, setCachedData } from './lib/cache';

import { buildCloudinaryUrl } from './lib/cloudinary';
// Auto-recover from deployment chunk desynchronization / stale module errors
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'chunk_reload_lock';
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Strict MIME type checking') ||
    msg.includes('Loading chunk')
  ) {
    const reloadKey = 'chunk_reload_lock';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
      sessionStorage.setItem(reloadKey, String(now));
      window.location.reload();
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason?.message || String(event?.reason || '');
  if (
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('error loading dynamically imported module') ||
    reason.includes('Strict MIME type') ||
    reason.includes('MIME type')
  ) {
    const reloadKey = 'chunk_reload_lock';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
      sessionStorage.setItem(reloadKey, String(now));
      window.location.reload();
    }
  }
});

// Prefetch critical data to improve LCP and TBT for first-time users
const prefetchCriticalData = async () => {
  try {
    const cachedBanners = getCachedData('home_banners_cache');
    if (!cachedBanners) {
      supabase.from('banners').select('*').eq('is_active', true).order('created_at', { ascending: false }).then(({ data }) => {
        if (data && data.length > 0) {
          setCachedData('home_banners_cache', data, 60);
          if (data[0] && data[0].image_url) {
            const width = window.innerWidth <= 640 ? 'w_640' : 'w_1600';
            const img = new Image();
            img.src = buildCloudinaryUrl(data[0].image_url, `${width},f_auto,q_auto`);
          }
        }
      });
    }

    const cachedSettings = getCachedData('site_settings_cache');
    if (!cachedSettings) {
      supabase.from('settings').select('*').then(({ data }) => {
        if (data) {
          const newSettings: any = { allow_guest_checkout: 'true' };
          data.forEach((item) => { newSettings[item.key] = item.value; });
          setCachedData('site_settings_cache', newSettings, 120);
        }
      });
    }
  } catch (e) {}
};

prefetchCriticalData();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
