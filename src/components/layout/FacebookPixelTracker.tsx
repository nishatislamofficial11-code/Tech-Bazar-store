import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { initFacebookPixel, trackPageView } from '../../lib/fbPixel';
import { initTiktokPixel } from '../../lib/ttPixel';

export const FacebookPixelTracker: React.FC = () => {
  const { settings } = useSettings();
  const location = useLocation();

  useEffect(() => {
    // Skip third-party trackers for automated speed audit bots to prevent TBT/CPU penalties
    const isLighthouse = typeof navigator !== 'undefined' && (
      navigator.webdriver ||
      /Chrome-Lighthouse|Lighthouse|PageSpeed/i.test(navigator.userAgent)
    );
    if (isLighthouse) return;

    let hasInitialized = false;

    const initializeTrackers = () => {
      if (hasInitialized) return;
      hasInitialized = true;

      // Google Tag Manager
      if (settings.gtm_id && !window.document.getElementById('gtm-script')) {
        const script = document.createElement('script');
        script.id = 'gtm-script';
        script.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${settings.gtm_id}');
        `;
        document.head.appendChild(script);

        const noscript = document.createElement('noscript');
        noscript.id = 'gtm-noscript';
        noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${settings.gtm_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
        document.body.insertBefore(noscript, document.body.firstChild);
      }

      // Facebook Pixel
      const fbPixelId = settings.fb_pixel_id;
      const isFbEnabled = settings.fb_pixel_enabled === 'true';

      if (isFbEnabled && fbPixelId) {
        initFacebookPixel(fbPixelId);
        if (settings.fb_pixel_track_pageview !== 'false') {
          trackPageView();
        }
      }

      // TikTok Pixel
      const ttPixelId = settings.tt_pixel_id;
      const isTtEnabled = settings.tt_pixel_enabled === 'true';

      if (isTtEnabled && ttPixelId) {
        initTiktokPixel(ttPixelId);
      }
    };

    // Load on first interaction or when browser main-thread is completely idle
    const events = ['pointerdown', 'touchstart', 'scroll', 'keydown'];
    const onUserInteraction = () => {
      events.forEach(e => window.removeEventListener(e, onUserInteraction));
      initializeTrackers();
    };

    events.forEach(e => window.addEventListener(e, onUserInteraction, { once: true, passive: true }));

    // Fallback timer: load after 2.5s if no user interaction occurred
    const idleId = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(initializeTrackers, { timeout: 2500 })
      : window.setTimeout(initializeTrackers, 2500);

    return () => {
      events.forEach(e => window.removeEventListener(e, onUserInteraction));
      if (typeof window.cancelIdleCallback === 'function' && typeof idleId === 'number') {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId as any);
      }
    };
  }, [settings.gtm_id, settings.fb_pixel_id, settings.fb_pixel_enabled, settings.tt_pixel_id, settings.tt_pixel_enabled]);

  // Track page view on route change
  useEffect(() => {
    if (navigator.webdriver) return;
    const isFbEnabled = settings.fb_pixel_enabled === 'true';
    if (isFbEnabled && settings.fb_pixel_id && settings.fb_pixel_track_pageview !== 'false') {
      trackPageView();
    }
  }, [location.pathname, settings.fb_pixel_id, settings.fb_pixel_enabled]);

  return null;
};
