export async function onRequest(context) {
  // Handle CORS for browser preflight requests
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const SUPABASE_URL = context.env?.VITE_SUPABASE_URL || context.env?.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = context.env?.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'Server configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await context.request.json().catch(() => ({}));
    const phone = String(body.phone || '').trim();
    const clientIp = String(body.ip || '').trim();
    const deviceId = String(body.deviceId || '').trim();
    const customReason = body.reason ? String(body.reason).trim() : '';

    if (!phone && !clientIp && !deviceId) {
      return new Response(JSON.stringify({ ok: false, error: 'Phone, Device ID or IP required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const cleanDigits = phone.replace(/\D/g, '');
    const normPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
    const validIp = clientIp && clientIp !== 'Unknown' && clientIp !== 'N/A' ? clientIp : '';

    const headers = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };

    // 1. Fetch current blacklist from pages
    let list = [];
    let pageRecordId = null;

    const pageRes = await fetch(`${SUPABASE_URL}/rest/v1/pages?slug=eq.__system_fraud_blacklist&select=id,content`, { headers });
    if (pageRes.ok) {
      const pageData = await pageRes.json();
      if (pageData && pageData.length > 0) {
        pageRecordId = pageData[0].id;
        try {
          const parsed = JSON.parse(pageData[0].content);
          if (Array.isArray(parsed)) list = parsed;
        } catch (e) {}
      }
    }

    let changed = false;
    let trapped = false;

    // Match by phone or deviceId
    for (const item of list) {
      const itemDigits = String(item.phone || '').replace(/\D/g, '');
      const itemNorm = itemDigits.length >= 10 ? itemDigits.slice(-10) : itemDigits;
      const phoneMatched = Boolean(normPhone && itemNorm && normPhone === itemNorm);
      const deviceMatched = Boolean(deviceId && item.deviceId && item.deviceId === deviceId);

      if (phoneMatched || deviceMatched) {
        trapped = true;
        if (validIp && item.ip !== validIp) {
          item.ip = validIp;
          changed = true;
        }
        if (deviceId && item.deviceId !== deviceId) {
          item.deviceId = deviceId;
          changed = true;
        }
        if (cleanDigits && item.phone !== cleanDigits) {
          item.phone = cleanDigits;
          changed = true;
        }
        const trapNote = `Auto-trapped device on order attempt`;
        if (!item.reason) {
          item.reason = trapNote;
          changed = true;
        }
      }
    }

    // If new addition requested
    if (!trapped && (body.forceBlock || normPhone || deviceId)) {
      list.unshift({
        id: Math.random().toString(36).substring(2, 9),
        phone: cleanDigits,
        ip: validIp || undefined,
        deviceId: deviceId || undefined,
        reason: customReason || 'Auto-trapped device on fraud attempt',
        addedAt: new Date().toISOString()
      });
      changed = true;
      trapped = true;
    }

    if (changed) {
      const jsonStr = JSON.stringify(list);

      // Save to pages
      if (pageRecordId) {
        await fetch(`${SUPABASE_URL}/rest/v1/pages?id=eq.${pageRecordId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ content: jsonStr, updated_at: new Date().toISOString() })
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/pages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            slug: '__system_fraud_blacklist',
            title: 'System Blacklist',
            content: jsonStr
          })
        });
      }

      // Save to settings as backup
      try {
        const settRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.fraud_blacklist&select=id`, { headers });
        if (settRes.ok) {
          const settData = await settRes.json();
          if (settData && settData.length > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.${settData[0].id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ value: jsonStr, updated_at: new Date().toISOString() })
            });
          } else {
            await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ key: 'fraud_blacklist', value: jsonStr })
            });
          }
        }
      } catch (e) {}
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      trapped, 
      changed, 
      ip: validIp, 
      phone 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
