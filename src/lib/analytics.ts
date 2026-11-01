import { supabase } from './supabase';

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('page_view_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('page_view_session_id', sessionId);
  }
  return sessionId;
};

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const trackEvent = async (eventName: string, meta: Record<string, any> = {}) => {
  try {
    const sessionId = getSessionId();
    const pid = meta.product_id || '';
    const isValidUuid = UUID_RE.test(pid);

    // Build the URL that identifies this event
    let url = `/event/${eventName}`;
    
    // Append product_id and any saved UTM params
    const utmParams = sessionStorage.getItem('initial_utm_params') || '';
    if (pid) {
      url += `?product_id=${pid}`;
      if (utmParams) {
        // utmParams already starts with '?' e.g. "?fbclid=..."
        url += '&' + utmParams.substring(1);
      }
    } else if (utmParams) {
      url += utmParams;
    }

    // Compute a referrer: use the stored initial external referrer if available
    let referrer = sessionStorage.getItem('initial_page_referrer') || document.referrer || 'Direct';
    try {
      const currentHost = window.location.hostname.toLowerCase();
      if (referrer && referrer !== 'Direct') {
        const refHost = new URL(referrer).hostname.toLowerCase();
        if (refHost === currentHost || currentHost.endsWith(refHost) || refHost.endsWith(currentHost)) {
          referrer = sessionStorage.getItem('initial_page_referrer') || 'Direct';
        }
      }
    } catch {
      // keep as-is
    }

    const payload: Record<string, any> = {
      url,
      referrer,
      session_id: sessionId,
    };

    // Only set product_id if it's a valid UUID (DB column is uuid type)
    if (isValidUuid) {
      payload.product_id = pid;
    }

    const { error } = await supabase.from('page_views').insert(payload);

    if (error) {
      console.error('[Analytics] trackEvent insert error:', error.message, error);
    }
  } catch (err) {
    console.error('[Analytics] trackEvent exception:', err);
  }
};
