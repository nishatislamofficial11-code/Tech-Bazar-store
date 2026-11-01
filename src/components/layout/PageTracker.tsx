import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('page_view_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('page_view_session_id', sessionId);
  }
  return sessionId;
};

export function PageTracker() {
  const location = useLocation();
  const hasTrackedInitialRender = useRef(false);

  useEffect(() => {
    // Basic debounce to avoid double-firing in strict mode
    if (!hasTrackedInitialRender.current) {
      hasTrackedInitialRender.current = true;
      // return; // In React 18 StrictMode this might fire twice, but let's just let it be or handle it
    }

    let isMounted = true;

    const trackPageView = async () => {
      try {
        const url = location.pathname + location.search;
        
        // Do not track admin panel views
        if (url.startsWith('/admin')) {
          return;
        }
        
        let productId = null;

        if (url.startsWith('/product/')) {
          const match = url.match(/\/product\/([^\/?#]+)/i);
          if (match && match[1]) {
            const identifier = match[1];
            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);
            
            let query = supabase.from('products').select('id');
            if (isUuid) {
              query = query.eq('id', identifier);
            } else {
              query = query.eq('slug', identifier);
            }
            
            const { data } = await query.single();
            if (data && isMounted) {
              productId = data.id;
            }
          }
        }

        if (!isMounted) return;

        let referrer = document.referrer || 'Direct';
        const currentHost = window.location.hostname.toLowerCase();
        
        // Save initial UTM parameters and click IDs
        if (!sessionStorage.getItem('initial_utm_params') && location.search) {
          const params = new URLSearchParams(location.search);
          const hasTracking = params.has('fbclid') || params.has('ttclid') || params.has('utm_source') || params.has('gclid');
          if (hasTracking) {
            sessionStorage.setItem('initial_utm_params', location.search);
          }
        }
        
        // Clean referrer if it is internal navigation on the same domain
        if (referrer && referrer !== 'Direct') {
          try {
            const refHost = new URL(referrer).hostname.toLowerCase();
            if (refHost === currentHost || (currentHost && currentHost.endsWith(refHost)) || (refHost && refHost.endsWith(currentHost))) {
              referrer = sessionStorage.getItem('initial_page_referrer') || 'Direct';
            } else {
              if (!sessionStorage.getItem('initial_page_referrer')) {
                 sessionStorage.setItem('initial_page_referrer', referrer);
              }
            }
          } catch {
            // keep as is
          }
        }

        const sessionId = getSessionId();

        await supabase.from('page_views').insert({
          url,
          referrer,
          session_id: sessionId,
          ...(productId ? { product_id: productId } : {})
        });

      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    // Small delay to ensure route has fully resolved if needed
    const timer = setTimeout(() => {
      trackPageView();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  return null;
}
