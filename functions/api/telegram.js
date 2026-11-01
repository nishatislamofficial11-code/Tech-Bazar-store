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
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
    // We need the service role key to bypass RLS and read the secret telegram token
    const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'Server configuration missing' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const { orderId } = await context.request.json();

    if (!orderId || typeof orderId !== 'string' || !orderId.startsWith('ORD-')) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid orderId' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const headers = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    };

    // Fetch the order securely
    const orderQuery = await fetch(`${SUPABASE_URL}/rest/v1/orders?shipping_address=like.*[TID:${orderId}]*&select=*,order_items(quantity,price,variant_options,products(title))&limit=1`, { headers });
    
    if (!orderQuery.ok) {
       return new Response(JSON.stringify({ ok: false, error: 'Failed to query order' }), { 
         status: 500,
         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
       });
    }
    
    const ordersData = await orderQuery.json();
    if (!ordersData || ordersData.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Order not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    const dbOrder = ordersData[0];

    // Anti-spam: check if order is older than 10 minutes
    const orderDate = new Date(dbOrder.created_at);
    const now = new Date();
    const diffMins = (now.getTime() - orderDate.getTime()) / (1000 * 60);
    if (diffMins > 10) {
      return new Response(JSON.stringify({ ok: false, error: 'Order is too old for notification' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Fetch telegram settings from Supabase
    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value&key=in.(telegram_bot_token,telegram_chat_id,telegram_notifications_enabled,telegram_bots)`, { headers });
    
    if (!settingsRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to fetch settings' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await settingsRes.json();
    const settingsMap = {};
    data.forEach(item => {
      settingsMap[item.key] = item.value;
    });

    const enabled = settingsMap.telegram_notifications_enabled === 'true';

    // Parse bots list
    let botList = [];
    if (settingsMap.telegram_bots) {
      try {
        const parsed = JSON.parse(settingsMap.telegram_bots);
        if (Array.isArray(parsed)) {
          botList = parsed
            .filter(b => b && (b.bot_token || b.botToken) && (b.chat_id || b.chatId))
            .map(b => ({
              botToken: String(b.bot_token || b.botToken).trim(),
              chatId: String(b.chat_id || b.chatId).trim(),
              name: b.name || 'Bot'
            }));
        }
      } catch (e) {
        console.warn('Could not parse telegram_bots JSON', e);
      }
    }

    // Fallback to legacy single bot config if list is empty
    if (botList.length === 0 && settingsMap.telegram_bot_token && settingsMap.telegram_chat_id) {
      botList.push({
        botToken: settingsMap.telegram_bot_token.trim(),
        chatId: settingsMap.telegram_chat_id.trim(),
        name: 'Main Bot'
      });
    }

    if (!enabled || botList.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Telegram notifications disabled or not configured' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Escape HTML special characters
    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const itemsText = dbOrder.order_items && dbOrder.order_items.length > 0
      ? dbOrder.order_items.map(item => {
          let itemTitle = escapeHtml(item.products?.title || 'Unknown Product');
          if (item.variant_options && typeof item.variant_options === 'object') {
            const variantStr = Object.entries(item.variant_options).map(([k, v]) => `${k}: ${v}`).join(', ');
            itemTitle += ` (${escapeHtml(variantStr)})`;
          }
          return `  • <b>${itemTitle}</b> (x${item.quantity}) - ৳${(item.price * item.quantity).toFixed(2)}`;
        }).join('\n')
      : '  • Item details not found';

    const orderIdDisplay = `<code>#${orderId}</code>`;
    const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });

    const messageHtml = `<b>🛒 NEW ORDER RECEIVED!</b>

<b>Order ID:</b> ${orderIdDisplay}
${escapeHtml(dbOrder.shipping_address)}

<b>📦 Purchased Products:</b>
${itemsText}

<b>💰 Total Payable:</b> <b>৳${Number(dbOrder.total_amount || 0).toFixed(2)}</b>
<b>🕒 Time (BD):</b> ${nowStr}`;

    // Broadcast simultaneously to ALL configured Telegram bots in parallel
    const sendPromises = botList.map(async (bot) => {
      try {
        const url = `https://api.telegram.org/bot${bot.botToken}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: bot.chatId,
            text: messageHtml,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });
        const resData = await response.json();
        return { ok: response.ok && resData.ok, bot: bot.name || bot.chatId, resData };
      } catch (err) {
        return { ok: false, bot: bot.name || bot.chatId, error: err.message };
      }
    });

    const sendResults = await Promise.allSettled(sendPromises);
    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    
    return new Response(JSON.stringify({ 
      ok: successCount > 0, 
      totalBots: botList.length, 
      successCount,
      results: sendResults.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason })
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Telegram notification error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
