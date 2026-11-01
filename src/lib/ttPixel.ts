/**
 * TikTok Pixel Integration Helper
 * Enhanced with First-Party Identity Identification for high EMQ scores
 */

declare global {
  interface Window {
    ttq: any;
  }
}

let isInitialized = false;
let currentPixelId = '';

/**
 * Identify user to TikTok Pixel (phone, email, external_id)
 * TikTok expects phone with international format (+880...)
 */
export const identifyTiktokUser = (userData?: { phone?: string; email?: string; externalId?: string }) => {
  if (typeof window === 'undefined' || !window.ttq || !userData) return;
  try {
    const identifyPayload: Record<string, string> = {};
    if (userData.phone) {
      const clean = userData.phone.replace(/\D/g, '');
      const e164 = clean.startsWith('880') ? `+${clean}` : clean.startsWith('0') ? `+88${clean}` : `+880${clean}`;
      identifyPayload.phone_number = e164;
    }
    if (userData.email) {
      identifyPayload.email = userData.email.trim().toLowerCase();
    }
    if (userData.externalId) {
      identifyPayload.external_id = userData.externalId;
    }

    if (Object.keys(identifyPayload).length > 0) {
      window.ttq.identify(identifyPayload);
    }
  } catch (e) {
    console.warn('TikTok identify error', e);
  }
};

/**
 * Initialize TikTok Pixel base script in document head
 */
export const initTiktokPixel = (pixelId: string) => {
  if (!pixelId || typeof window === 'undefined') return;

  // If already initialized with same ID, do nothing
  if (isInitialized && currentPixelId === pixelId && window.ttq) {
    return;
  }

  currentPixelId = pixelId;
  isInitialized = true;

  /* eslint-disable */
  (function (w: any, d: any, t: any) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t: any,e: any){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t: any){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e: any,n: any){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  })(window, document, 'ttq');
  /* eslint-enable */

  window.ttq.load(pixelId);
  window.ttq.page();
};

/**
 * Track PageView event
 */
export const trackTiktokPageView = (eventId?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.page(eventId ? { event_id: eventId } : undefined);
  }
};

/**
 * Track ViewContent event (Product view)
 */
export const trackTiktokViewContent = (product: { id?: string; title?: string; name?: string; price?: number; category?: string }, eventId?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('ViewContent', {
      contents: [{
        content_id: product.id || '',
        content_name: product.title || product.name || '',
        content_type: 'product',
        content_category: product.category || '',
        price: Number(product.price || 0),
        quantity: 1
      }],
      content_type: 'product',
      value: Number(product.price || 0),
      currency: 'BDT'
    }, eventId ? { event_id: eventId } : undefined);
  }
};

/**
 * Track AddToCart event
 */
export const trackTiktokAddToCart = (product: { id?: string; title?: string; name?: string; price?: number; category?: string }, quantity: number = 1, eventId?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('AddToCart', {
      contents: [{
        content_id: product.id || '',
        content_name: product.title || product.name || '',
        content_type: 'product',
        content_category: product.category || '',
        price: Number(product.price || 0),
        quantity: quantity
      }],
      content_type: 'product',
      value: Number(product.price || 0) * quantity,
      currency: 'BDT'
    }, eventId ? { event_id: eventId } : undefined);
  }
};

/**
 * Track InitiateCheckout event
 */
export const trackTiktokInitiateCheckout = (items: Array<{ id?: string; product_id?: string; title?: string; price?: number; quantity?: number }>, totalValue: number, eventId?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    const contents = items.map(item => ({
      content_id: item.id || item.product_id || '',
      content_name: item.title || '',
      content_type: 'product',
      price: Number(item.price || 0),
      quantity: item.quantity || 1
    }));
    
    window.ttq.track('InitiateCheckout', {
      contents: contents,
      content_type: 'product',
      value: Number(totalValue || 0),
      currency: 'BDT'
    }, eventId ? { event_id: eventId } : undefined);
  }
};

/**
 * Track CompletePayment event
 */
export const trackTiktokCompletePayment = (order: { id?: string; items?: any[]; total_amount?: number; total?: number }, eventId?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    const items = order.items || [];
    const contents = items.map(item => ({
      content_id: item.id || item.product_id || '',
      content_name: item.title || item.name || '',
      content_type: 'product',
      price: Number(item.price || 0),
      quantity: item.quantity || 1
    }));
    const value = Number(order.total_amount || order.total || 0);

    window.ttq.track('CompletePayment', {
      contents: contents,
      content_type: 'product',
      value: value,
      currency: 'BDT'
    }, eventId ? { event_id: eventId } : undefined);
  }
};

/**
 * Track Search event
 */
export const trackTiktokSearch = (searchQuery: string, eventId?: string) => {
  if (typeof window !== 'undefined' && window.ttq && searchQuery.trim()) {
    window.ttq.track('Search', {
      query: searchQuery.trim()
    }, eventId ? { event_id: eventId } : undefined);
  }
};
