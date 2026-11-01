/**
 * Facebook (Meta) Pixel & Conversions API (CAPI) Integration Helper
 * Enhanced with First-Party Identity Resolution for high Event Match Quality (EMQ 8.5+)
 */
import { 
  trackTiktokPageView, 
  trackTiktokViewContent, 
  trackTiktokAddToCart, 
  trackTiktokInitiateCheckout, 
  trackTiktokCompletePayment, 
  trackTiktokSearch,
  identifyTiktokUser
} from './ttPixel';

import {
  getOrSetCustomerId,
  getOrSetFbc,
  getOrSetFbp,
  getOrSetTtp,
  getOrSetTtclid,
  saveCachedUserData,
  getCachedUserData,
  resolveBdLocation,
  cleanBdPhone,
  CachedCustomerIdentity
} from './trackingIdentity';

export {
  getOrSetCustomerId,
  getOrSetFbc,
  getOrSetFbp,
  getOrSetTtp,
  getOrSetTtclid,
  saveCachedUserData,
  getCachedUserData,
  resolveBdLocation,
  cleanBdPhone
};

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    dataLayer: any[];
  }
}

export interface CustomerUserData {
  phone?: string;
  name?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  country?: string;
}

let isInitialized = false;
let currentPixelId = '';

export const generateEventId = (prefix: string = 'event') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Backward compatibility alias
 */
export const getFbp = getOrSetFbp;
export const getTtp = getOrSetTtp;

/**
 * Push Google Tag Manager / GA4 eCommerce Events
 */
export const pushToDataLayer = (eventName: string, ecommerceData?: any) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (ecommerceData) {
    // Standard GA4 eCommerce practice: Clear previous ecommerce object before push
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: eventName,
      ecommerce: ecommerceData
    });
  } else {
    window.dataLayer.push({
      event: eventName
    });
  }
};

/**
 * Enriches user data with cached customer identity and geolocation
 */
const resolveHydratedUserData = (userData?: CustomerUserData): CustomerUserData => {
  const cached = getCachedUserData();
  const merged: CustomerUserData = {
    phone: cleanBdPhone(userData?.phone) || cached.phone || undefined,
    name: userData?.name || cached.name || undefined,
    email: (userData?.email || cached.email || '').trim().toLowerCase() || undefined,
    address: userData?.address || cached.address || undefined,
    country: 'bd'
  };

  const geo = resolveBdLocation(merged.address, undefined);
  merged.city = userData?.city || cached.city || geo.city || undefined;
  merged.state = userData?.state || cached.state || geo.state || undefined;

  // Persist updated identity to local cache if newly provided
  if (userData?.phone || userData?.name || userData?.email || userData?.address) {
    saveCachedUserData({
      phone: merged.phone,
      name: merged.name,
      email: merged.email,
      city: merged.city,
      state: merged.state,
      address: merged.address
    });
  }

  return merged;
};

/**
 * Send server-side event to Cloudflare Pages Functions (/api/track)
 * Sends complete First-Party Identity (FBC, FBP, TTP, TTCLID, Customer ID, Enriched User Data)
 */
export const sendServerEvent = async (
  eventName: string,
  eventData?: any,
  eventId?: string,
  userData?: CustomerUserData
) => {
  try {
    const fbc = getOrSetFbc();
    const fbp = getOrSetFbp();
    const ttp = getOrSetTtp();
    const ttclid = getOrSetTtclid();
    const customerId = getOrSetCustomerId();
    const enrichedUser = resolveHydratedUserData(userData);

    // Sync identity to TikTok browser pixel if phone or email is available
    if (enrichedUser.phone || enrichedUser.email) {
      identifyTiktokUser({
        phone: enrichedUser.phone,
        email: enrichedUser.email,
        externalId: customerId
      });
    }

    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        eventData,
        eventId,
        userData: enrichedUser,
        customerId,
        url: window.location.href,
        fbp,
        fbc,
        ttp,
        ttclid
      })
    });
  } catch (e) {
    console.error('Server tracking error', e);
  }
};

/**
 * Initialize Facebook Pixel base script in document head
 */
export const initFacebookPixel = (pixelId: string) => {
  if (!pixelId || typeof window === 'undefined') return;

  // Pre-seed first-party cookies on initial load
  getOrSetCustomerId();
  getOrSetFbc();
  getOrSetFbp();
  getOrSetTtp();
  getOrSetTtclid();

  // If already initialized with same ID, do nothing
  if (isInitialized && currentPixelId === pixelId && window.fbq) {
    return;
  }

  currentPixelId = pixelId;
  isInitialized = true;

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  // Disable automatic tracking of button clicks (SubscribedButtonClick)
  window.fbq('set', 'autoConfig', false, pixelId);
  window.fbq('init', pixelId);
};

/**
 * Track PageView event
 */
export const trackPageView = () => {
  getOrSetFbc();
  const eventId = generateEventId('pageview');
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView', {}, { eventID: eventId });
  }
  trackTiktokPageView(eventId);
  sendServerEvent('PageView', {}, eventId);

  pushToDataLayer('page_view', {
    page_location: typeof window !== 'undefined' ? window.location.href : '',
    page_path: typeof window !== 'undefined' ? window.location.pathname : ''
  });
};

/**
 * Track ViewContent event (Product view)
 * Enriches server event with persistent customer identity & cached user data
 */
export const trackViewContent = (product: { id?: string; title?: string; name?: string; price?: number; category?: string }) => {
  const price = Number(product.price || 0);
  const title = product.title || product.name || '';
  const id = product.id || '';
  const eventId = generateEventId('viewcontent');
  const eventData = {
    content_ids: id ? [id] : [],
    content_name: title,
    content_type: 'product',
    value: price,
    currency: 'BDT',
    category: product.category || ''
  };

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'ViewContent', eventData, { eventID: eventId });
  }
  trackTiktokViewContent(product, eventId);
  sendServerEvent('ViewContent', eventData, eventId);

  pushToDataLayer('view_item', {
    currency: 'BDT',
    value: price,
    items: [{
      item_id: id,
      item_name: title,
      item_category: product.category || '',
      price: price,
      quantity: 1
    }]
  });
};

/**
 * Track AddToCart event
 * Enriches server event with persistent customer identity & cached user data
 */
export const trackAddToCart = (product: { id?: string; title?: string; name?: string; price?: number; category?: string }, quantity: number = 1) => {
  const price = Number(product.price || 0);
  const title = product.title || product.name || '';
  const id = product.id || '';
  const totalValue = price * quantity;
  const eventId = generateEventId('addtocart');
  const eventData = {
    content_ids: id ? [id] : [],
    content_name: title,
    content_type: 'product',
    value: totalValue,
    currency: 'BDT',
    num_items: quantity
  };

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'AddToCart', eventData, { eventID: eventId });
  }
  trackTiktokAddToCart(product, quantity, eventId);
  sendServerEvent('AddToCart', eventData, eventId);

  pushToDataLayer('add_to_cart', {
    currency: 'BDT',
    value: totalValue,
    items: [{
      item_id: id,
      item_name: title,
      item_category: product.category || '',
      price: price,
      quantity: quantity
    }]
  });
};

/**
 * Track InitiateCheckout event
 */
export const trackInitiateCheckout = (
  items: Array<{ id?: string; product_id?: string; title?: string; price?: number; quantity?: number }>,
  totalValue: number,
  userData?: CustomerUserData
) => {
  const ids = items.map(item => item.id || item.product_id).filter(Boolean);
  const eventId = generateEventId('initiatecheckout');
  const eventData = {
    content_ids: ids,
    content_type: 'product',
    value: Number(totalValue || 0),
    currency: 'BDT',
    num_items: items.reduce((acc, item) => acc + (item.quantity || 1), 0)
  };

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'InitiateCheckout', eventData, { eventID: eventId });
  }
  trackTiktokInitiateCheckout(items, totalValue, eventId);
  sendServerEvent('InitiateCheckout', eventData, eventId, userData);

  pushToDataLayer('begin_checkout', {
    currency: 'BDT',
    value: Number(totalValue || 0),
    items: items.map(item => ({
      item_id: item.id || item.product_id || '',
      item_name: item.title || '',
      price: Number(item.price || 0),
      quantity: item.quantity || 1
    }))
  });
};

/**
 * Track Purchase event
 */
export const trackPurchase = (
  order: { id?: string; items?: any[]; total_amount?: number; total?: number },
  userData?: CustomerUserData
) => {
  const items = order.items || [];
  const ids = items.map(item => item.id || item.product_id || item.title).filter(Boolean);
  const value = Number(order.total_amount || order.total || 0);
  const eventId = order.id ? `purchase_${order.id}` : generateEventId('purchase');

  const eventParams = {
    content_ids: ids,
    content_type: 'product',
    value: value,
    currency: 'BDT',
    num_items: items.length || 1,
    order_id: order.id || ''
  };

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', eventParams, { eventID: eventId });
  }
  trackTiktokCompletePayment(order, eventId);
  // Always trigger server-side CAPI event with full customer payload
  sendServerEvent('Purchase', eventParams, eventId, userData);

  pushToDataLayer('purchase', {
    transaction_id: order.id || eventId,
    currency: 'BDT',
    value: value,
    items: items.map(item => ({
      item_id: item.id || item.product_id || '',
      item_name: item.title || item.name || '',
      price: Number(item.price || 0),
      quantity: item.quantity || 1
    }))
  });
};

/**
 * Track Search event
 */
export const trackSearch = (searchQuery: string) => {
  const eventId = generateEventId('search');
  if (typeof window !== 'undefined' && window.fbq && searchQuery.trim()) {
    window.fbq('track', 'Search', {
      search_string: searchQuery.trim()
    }, { eventID: eventId });
  }
  trackTiktokSearch(searchQuery, eventId);
  sendServerEvent('Search', { search_string: searchQuery.trim() }, eventId);
  
  pushToDataLayer('search', {
    search_term: searchQuery.trim()
  });
};

/**
 * Track Custom Event
 */
export const trackCustomEvent = (eventName: string, params?: Record<string, any>) => {
  if (window.fbq && isInitialized) {
    window.fbq('trackCustom', eventName, params || {});
  }
  pushToDataLayer(eventName, params);
};
