export async function onRequest(context) {
  // Handle CORS for browser preflight requests
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'Server configuration missing' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized: Missing token' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Verify JWT by calling Supabase Auth API
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY }
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized: Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const user = await userRes.json();

    // Verify user role
    const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
    });
    
    if (!roleRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to verify role' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const roleData = await roleRes.json();

    if (!roleData || roleData.length === 0 || roleData[0].role !== 'admin') {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden: Requires admin role' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const payload = await context.request.json();
    const { action, botToken, chatId, text } = payload;
    
    if (!botToken) {
        return new Response(JSON.stringify({ ok: false, error: 'Bot token is required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const cleanToken = botToken.trim();

    if (action === 'test') {
        const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text || 'Test message from server',
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });
        const result = await response.json();
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } else if (action === 'autofetch') {
        const url = `https://api.telegram.org/bot${cleanToken}/getUpdates`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.ok || !data.result || data.result.length === 0) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'No messages found! Please open your bot on Telegram, send /start, and try clicking Auto Fetch again.'
          }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
    
        // Search latest updates from end
        for (let i = data.result.length - 1; i >= 0; i--) {
          const item = data.result[i];
          const foundChatId = item.message?.chat?.id || item.channel_post?.chat?.id || item.my_chat_member?.chat?.id;
          if (foundChatId) {
            return new Response(JSON.stringify({ ok: true, chatId: String(foundChatId) }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
          }
        }
        
        return new Response(JSON.stringify({ ok: false, error: 'Could not detect Chat ID from latest messages.' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  } catch (error) {
    console.error('Telegram Admin proxy error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
