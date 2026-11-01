/**
 * Cloudflare Pages Functions - /api/track
 * Advanced Server-Side Conversions API Engine for Meta CAPI and TikTok Events API
 * Supports E.164 dual-hashing, first-party cookie recovery, and persistent identity stitching
 */

async function sha256(val) {
  if (!val) return undefined;
  const str = String(val).trim().toLowerCase();
  if (!str) return undefined;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.error('Crypto error:', e);
  }
  return undefined;
}

/**
 * Standardize Bangladeshi Phone numbers
 * Converts Bengali digits to English and standardizes to 8801XXXXXXXXX
 */
function normalizePhone(phone) {
  if (!phone) return undefined;
  const banglaDigits = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const clean = String(phone).replace(/[০-৯]/g, d => banglaDigits[d] || d);
  let digits = clean.replace(/\D/g, '');
  if (!digits) return undefined;

  if (digits.startsWith('880')) {
    // 8801...
  } else if (digits.startsWith('0')) {
    digits = '88' + digits;
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '880' + digits;
  }

  return digits.length === 13 && digits.startsWith('8801') ? digits : digits;
}

/**
 * Parse standard Bangladeshi district / city from address or city string
 */
function parseBdLocation(cityInput, addressInput) {
  const text = `${cityInput || ''} ${addressInput || ''}`.toLowerCase();
  
  const mapping = {
    dhaka: 'dhaka', 'ঢাকা': 'dhaka',
    chattogram: 'chattogram', chittagong: 'chattogram', 'চট্টগ্রাম': 'chattogram',
    sylhet: 'sylhet', 'সিলেট': 'sylhet',
    gazipur: 'gazipur', 'গাজীপুর': 'gazipur',
    narayanganj: 'narayanganj', 'নারায়ণগঞ্জ': 'narayanganj',
    rajshahi: 'rajshahi', 'রাজশাহী': 'rajshahi',
    khulna: 'khulna', 'খুলনা': 'khulna',
    barishal: 'barishal', 'বরিশাল': 'barishal',
    rangpur: 'rangpur', 'রংপুর': 'rangpur',
    cumilla: 'cumilla', comilla: 'cumilla', 'কুমিল্লা': 'cumilla',
    bogura: 'bogura', bogra: 'bogura', 'বগুড়া': 'bogura',
    mymensingh: 'mymensingh', 'ময়মনসিংহ': 'mymensingh',
    feni: 'feni', 'ফেনী': 'feni',
    jashore: 'jashore', 'যশোর': 'jashore',
    coxsbazar: 'coxsbazar', 'কক্সবাজার': 'coxsbazar',
    tangail: 'tangail', 'টাঙ্গাইল': 'tangail'
  };

  for (const [key, val] of Object.entries(mapping)) {
    if (text.includes(key)) {
      return { city: val, country: 'bd' };
    }
  }

  // If city is valid single-word name (and not "outside dhaka")
  if (cityInput && !cityInput.toLowerCase().includes('outside') && /^[a-zA-Z\s]+$/.test(cityInput)) {
    const cleanCity = cityInput.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (cleanCity.length > 2) {
      return { city: cleanCity, country: 'bd' };
    }
  }

  return { city: undefined, country: 'bd' };
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await context.request.json();
    const { 
      eventName, 
      eventData, 
      eventId, 
      userData = {}, 
      customerId,
      url, 
      ip, 
      userAgent, 
      fbp, 
      fbc, 
      ttp, 
      ttclid 
    } = body;

    // Parse HTTP Cookie header as fallback for server-side match reliability
    const cookieHeader = context.request.headers.get('Cookie') || '';
    const cookies = {};
    cookieHeader.split(';').forEach(c => {
      const [k, ...v] = c.trim().split('=');
      if (k) cookies[k] = decodeURIComponent(v.join('='));
    });

    const resolvedFbc = fbc || cookies['_fbc'] || undefined;
    const resolvedFbp = fbp || cookies['_fbp'] || undefined;
    const resolvedTtp = ttp || cookies['_ttp'] || undefined;
    const resolvedTtclid = ttclid || cookies['_ttclid'] || undefined;
    const resolvedCustomerId = customerId || cookies['_bd_cid'] || undefined;

    const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_SERVICE_KEY || context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn('Track API: missing Supabase credentials in environment.');
      return new Response(JSON.stringify({ success: false, message: 'Tracking disabled: missing environment credentials' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Fetch tracking settings from Supabase
    const settingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    if (!settingsResponse.ok) {
      throw new Error('Failed to fetch settings from DB');
    }
    
    const settingsList = await settingsResponse.json();
    const settings = {};
    settingsList.forEach(s => { settings[s.key] = s.value; });

    // Prepare hashed user data with DUAL-HASHING for Meta CAPI and TikTok API
    const normalizedPhone = normalizePhone(userData.phone);
    
    // Meta CAPI requires country code WITHOUT plus (e.g. 88017XXXXXXXX)
    const hashedMetaPhone = normalizedPhone ? await sha256(normalizedPhone) : undefined;
    
    // TikTok Events API strictly requires international E.164 WITH plus (e.g. +88017XXXXXXXX)
    const hashedTiktokPhone = normalizedPhone ? await sha256('+' + normalizedPhone) : undefined;

    let hashedFirstName = undefined;
    let hashedLastName = undefined;
    if (userData.name) {
      const cleanName = String(userData.name).trim().replace(/[^\p{L}\s]/gu, '');
      const parts = cleanName.split(/\s+/).filter(Boolean);
      if (parts.length > 0 && parts[0]) {
        hashedFirstName = await sha256(parts[0].toLowerCase());
      }
      if (parts.length > 1) {
        hashedLastName = await sha256(parts.slice(1).join(' ').toLowerCase());
      }
    }

    const hashedEmail = userData.email ? await sha256(String(userData.email).trim().toLowerCase()) : undefined;

    // Resolve geographic identity
    const geo = parseBdLocation(userData.city, userData.address);
    const hashedCity = geo.city ? await sha256(geo.city) : undefined;
    const hashedCountry = await sha256(geo.country);

    // Persistent External ID (NEVER use temporary eventId!)
    // Ties anonymous browsing sessions directly to eventual buyer profile
    const rawExternalId = normalizedPhone 
      ? `bd_${normalizedPhone}` 
      : (resolvedCustomerId ? `bd_${resolvedCustomerId}` : undefined);
    const hashedExternalId = rawExternalId ? await sha256(rawExternalId) : undefined;

    const clientIp = ip || context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('X-Forwarded-For');
    const clientUa = userAgent || context.request.headers.get('User-Agent');

    const promises = [];

    // 1. Facebook Conversions API (CAPI)
    if (settings.fb_pixel_id && settings.fb_pixel_access_token) {
      const fbUserData = {
        client_ip_address: clientIp,
        client_user_agent: clientUa,
        fbp: resolvedFbp || undefined,
        fbc: resolvedFbc || undefined,
        ...(hashedMetaPhone ? { ph: [hashedMetaPhone] } : {}),
        ...(hashedFirstName ? { fn: [hashedFirstName] } : {}),
        ...(hashedLastName ? { ln: [hashedLastName] } : {}),
        ...(hashedEmail ? { em: [hashedEmail] } : {}),
        ...(hashedCity ? { ct: [hashedCity] } : {}),
        ...(hashedCountry ? { country: [hashedCountry] } : {}),
        ...(hashedExternalId ? { external_id: [hashedExternalId] } : {})
      };

      const fbPayload = {
        data: [{
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: eventId,
          event_source_url: url,
          user_data: fbUserData,
          custom_data: eventData
        }],
        test_event_code: settings.fb_pixel_test_code || undefined
      };

      promises.push(
        fetch(`https://graph.facebook.com/v19.0/${settings.fb_pixel_id}/events?access_token=${settings.fb_pixel_access_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbPayload)
        }).catch(err => console.error('FB CAPI Error:', err))
      );
    }

    // 2. TikTok Events API
    const ttPixelId = (settings.tiktok_pixel_id || settings.tt_pixel_id || '').trim();
    const ttAccessToken = (settings.tiktok_access_token || '').trim();
    if (ttPixelId && ttAccessToken) {
      // Map eventData to TikTok properties format
      const ttContents = Array.isArray(eventData?.content_ids) && eventData.content_ids.length > 0
        ? eventData.content_ids.map(id => ({
            content_id: String(id),
            content_type: eventData.content_type || 'product',
            content_name: eventData.content_name || '',
            content_category: eventData.category || '',
            price: Number(eventData.value || 0),
            quantity: 1
          }))
        : undefined;

      const ttProperties = {
        ...(ttContents ? { contents: ttContents } : {}),
        content_type: eventData?.content_type || 'product',
        value: Number(eventData?.value || 0),
        currency: eventData?.currency || 'BDT',
        query: eventData?.search_string || undefined,
        description: eventData?.content_name || undefined
      };

      // Map standard event names to TikTok Events API names
      let ttEvent = eventName;
      if (eventName === 'PageView') ttEvent = 'Pageview';
      else if (eventName === 'Purchase') ttEvent = 'CompletePayment';

      const ttPayload = {
        event_source: 'web',
        event_source_id: ttPixelId,
        ...(settings.tiktok_test_event_code ? { test_event_code: settings.tiktok_test_event_code.trim() } : {}),
        data: [{
          event: ttEvent,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          user: {
            user_agent: clientUa,
            ip: clientIp,
            ...(resolvedTtp ? { ttp: resolvedTtp } : {}),
            ...(hashedTiktokPhone ? { phone_number: hashedTiktokPhone } : {}),
            ...(hashedEmail ? { email: hashedEmail } : {}),
            ...(hashedExternalId ? { external_id: hashedExternalId } : {})
          },
          page: {
            url: url
          },
          ...(resolvedTtclid ? { ad: { callback: resolvedTtclid } } : {}),
          properties: ttProperties
        }]
      };

      promises.push(
        fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Access-Token': ttAccessToken
          },
          body: JSON.stringify(ttPayload)
        })
        .then(async res => {
          const resJson = await res.json().catch(() => null);
          if (!res.ok || (resJson && resJson.code !== 0)) {
            console.error('TikTok Events API error:', res.status, JSON.stringify(resJson));
          }
        })
        .catch(err => console.error('TikTok API Network Error:', err))
      );
    }

    await Promise.all(promises);

    return new Response(JSON.stringify({ 
      success: true,
      matched: {
        fbc: Boolean(resolvedFbc),
        fbp: Boolean(resolvedFbp),
        ttp: Boolean(resolvedTtp),
        ttclid: Boolean(resolvedTtclid),
        phone: Boolean(normalizedPhone),
        externalId: Boolean(rawExternalId)
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
  }
}
