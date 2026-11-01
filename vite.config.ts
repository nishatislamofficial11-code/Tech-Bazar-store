import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import {defineConfig, loadEnv} from 'vite';



export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'catalog-feed-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
            const cleanPath = parsedUrl.pathname.replace(/\/+/g, '/');

            if (cleanPath === '/api/catalog-feed' || cleanPath === '/api/catalog-feed.php') {
              const format = parsedUrl.searchParams.get('format') || 'xml';
              const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
              const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';
              const siteUrl = `http://${req.headers.host || 'localhost:3000'}`;

              try {
                let products: any[] = [];
                let siteTitle = 'Store';

                if (SUPABASE_URL && SUPABASE_ANON_KEY) {
                  const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
                    headers: {
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                  });
                  if (prodRes.ok) {
                    products = (await prodRes.json()) || [];
                  }

                  try {
                    const settRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.siteName`, {
                      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
                    });
                    if (settRes.ok) {
                      const settData = await settRes.json();
                      if (settData && settData[0]?.value) siteTitle = settData[0].value;
                    }
                  } catch (e) {}
                }

                if (format === 'csv') {
                  const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
                  const rows = products.map((p: any) => {
                    const id = p.id;
                    const title = `"${(p.title || p.name || 'Product').replace(/"/g, '""')}"`;
                    const cleanDesc = (p.description || p.title || '').replace(/<[^>]*>?/gm, '').replace(/"/g, '""').trim();
                    const description = `"${cleanDesc.slice(0, 500)}"`;
                    const availability = (p.stock ?? 100) > 0 ? 'in stock' : 'out of stock';
                    const condition = 'new';
                    const price = `"${p.price || 0} BDT"`;
                    const link = `"${siteUrl}/product/${p.slug || p.id}"`;
                    const imageLink = `"${p.image || ''}"`;
                    const brand = `"${(p.store || siteTitle).replace(/"/g, '""')}"`;
                    return [id, title, description, availability, condition, price, link, imageLink, brand].join(',');
                  });

                  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end([headers.join(','), ...rows].join('\n'));
                  return;
                }

                const cdata = (val: any) => {
                  const cleaned = String(val || '')
                    .replace(/<[^>]*>?/gm, ' ')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/]]>/g, ']]]]><![CDATA[>');
                  return `<![CDATA[${cleaned}]]>`;
                };

                // Default XML
                const itemsXml = products.map((p: any) => {
                  const id = p.id;
                  const title = p.title || p.name || 'Product';
                  const cleanDesc = (p.description || p.title || '').slice(0, 5000);
                  const availability = (p.stock ?? 100) > 0 ? 'in stock' : 'out of stock';
                  const price = `${Number(p.price || 0).toFixed(2)} BDT`;
                  const link = `${siteUrl}/product/${p.slug || p.id}`;
                  const imageLink = p.image || '';
                  const brand = p.store || siteTitle;

                  return `    <item>
      <g:id>${cdata(id)}</g:id>
      <g:sku_id>${cdata(id)}</g:sku_id>
      <g:title>${cdata(title)}</g:title>
      <g:description>${cdata(cleanDesc)}</g:description>
      <g:link>${cdata(link)}</g:link>
      <g:image_link>${cdata(imageLink)}</g:image_link>
      <g:brand>${cdata(brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
    </item>`;
                }).join('\n');

                const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${cdata(siteTitle)}</title>
    <link>${siteUrl}</link>
    <description>${cdata(`Facebook & TikTok Live Product Catalog Feed for ${siteTitle}`)}</description>
${itemsXml}
  </channel>
</rss>`;

                res.setHeader('Content-Type', 'application/xml; charset=utf-8');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(xml);
                return;
              } catch (err: any) {
                res.statusCode = 500;
                res.end(`Error generating catalog feed: ${err.message}`);
                return;
              }
            }

            if (cleanPath === '/api/telegram-admin') {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const { action, botToken, chatId, text } = JSON.parse(body || '{}');
                    const cleanToken = (botToken || '').trim();

                    if (!cleanToken) {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ ok: false, error: 'Bot Token is required' }));
                      return;
                    }

                    if (action === 'autofetch') {
                      const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates`);
                      const data: any = await tgRes.json();
                      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
                        for (let i = data.result.length - 1; i >= 0; i--) {
                          const item = data.result[i];
                          const foundChatId = item.message?.chat?.id || item.channel_post?.chat?.id || item.my_chat_member?.chat?.id || item.callback_query?.message?.chat?.id;
                          if (foundChatId) {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true, chatId: String(foundChatId) }));
                            return;
                          }
                        }
                      }
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ ok: false, error: data.description || 'No messages found! Please send /start to your bot on Telegram first.' }));
                      return;
                    }

                    if (action === 'test') {
                      const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          chat_id: chatId,
                          text: text || 'Test message from server',
                          parse_mode: 'HTML',
                          disable_web_page_preview: true
                        })
                      });
                      const data: any = await tgRes.json();
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                      return;
                    }

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: false, error: 'Invalid action' }));
                  } catch (err: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: false, error: err.message }));
                  }
                });
                return;
              }
            }

            if (cleanPath === '/api/track') {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body || '{}');
                    const { eventName, eventData, eventId, userData = {}, url, fbp, fbc } = parsed;

                    const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
                    const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';

                    if (!SUPABASE_URL || !SUPABASE_KEY) {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Supabase credentials not configured in environment' }));
                      return;
                    }

                    const settRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, {
                      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                    });
                    const settingsList = await settRes.json() || [];
                    const settings: Record<string, string> = {};
                    settingsList.forEach((s: any) => { settings[s.key] = s.value; });

                    const sha256 = (val: any) => {
                      if (!val) return undefined;
                      const str = String(val).trim().toLowerCase();
                      if (!str) return undefined;
                      return crypto.createHash('sha256').update(str).digest('hex');
                    };

                    let digits = String(userData.phone || '').replace(/\D/g, '');
                    let normalizedPhone: string | undefined = undefined;
                    if (digits) {
                      if (digits.startsWith('880')) normalizedPhone = digits;
                      else if (digits.startsWith('0')) normalizedPhone = '88' + digits;
                      else if (digits.length === 10 && digits.startsWith('1')) normalizedPhone = '880' + digits;
                      else normalizedPhone = digits;
                    }

                    const hashedPhone = sha256(normalizedPhone);
                    const hashedEmail = sha256(userData.email);
                    const hashedCountry = sha256(userData.country || 'bd');
                    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '103.145.118.20';
                    const clientUa = (req.headers['user-agent'] as string) || '';

                    const promises: Promise<any>[] = [];

                    if (settings.fb_pixel_id && settings.fb_pixel_access_token) {
                      const fbUserData = {
                        client_ip_address: clientIp,
                        client_user_agent: clientUa,
                        fbp: fbp || undefined,
                        fbc: fbc || undefined,
                        ...(hashedPhone ? { ph: [hashedPhone] } : {}),
                        ...(hashedEmail ? { em: [hashedEmail] } : {}),
                        ...(hashedCountry ? { country: [hashedCountry] } : {})
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
                        }).catch(e => console.error('Dev FB CAPI Error:', e))
                      );
                    }

                    await Promise.all(promises);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true }));
                    return;
                  } catch (e: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: e.message }));
                    return;
                  }
                });
                return;
              }
            }

            if (cleanPath === '/api/blacklist-trap') {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body || '{}');
                    const phone = String(parsed.phone || '').trim();
                    const clientIp = String(parsed.ip || '').trim();
                    const deviceId = String(parsed.deviceId || '').trim();
                    const customReason = parsed.reason ? String(parsed.reason).trim() : '';

                    const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
                    const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';

                    if (!SUPABASE_URL || !SUPABASE_KEY) {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ ok: false, error: 'Supabase credentials missing' }));
                      return;
                    }

                    const cleanDigits = phone.replace(/\D/g, '');
                    const normPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
                    const validIp = clientIp && clientIp !== 'Unknown' && clientIp !== 'N/A' ? clientIp : '';

                    const headers = {
                      apikey: SUPABASE_KEY,
                      Authorization: `Bearer ${SUPABASE_KEY}`,
                      'Content-Type': 'application/json',
                    };

                    let list: any[] = [];
                    let pageRecordId: string | null = null;

                    const pageRes = await fetch(`${SUPABASE_URL}/rest/v1/pages?slug=eq.__system_fraud_blacklist&select=id,content`, { headers });
                    if (pageRes.ok) {
                      const pageData = await pageRes.json();
                      if (pageData && pageData.length > 0) {
                        pageRecordId = pageData[0].id;
                        try {
                          const parsedContent = JSON.parse(pageData[0].content);
                          if (Array.isArray(parsedContent)) list = parsedContent;
                        } catch (e) {}
                      }
                    }

                    let changed = false;
                    let trapped = false;

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

                    if (!trapped && (parsed.forceBlock || normPhone || deviceId)) {
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
                          }
                        }
                      } catch (e) {}
                    }

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true, trapped, changed, ip: validIp, phone }));
                    return;
                  } catch (e: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                    return;
                  }
                });
                return;
              }
            }

            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/pathao-sandbox': {
          target: 'https://courier-api-sandbox.pathao.com',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/pathao-sandbox/, ''),
        },
        '/api/pathao-prod': {
          target: 'https://api-hermes.pathao.com',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/pathao-prod/, ''),
        },
        '/api/steadfast': {
          target: 'https://portal.packzy.com/api/v1',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/steadfast/, ''),
        },
        '/api/groq': {
          target: 'https://api.groq.com/openai/v1',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/groq/, ''),
        },
        '/api/gemini-proxy': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/gemini-proxy/, ''),
        },
        '/api/openai-proxy': {
          target: 'https://api.openai.com/v1',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/openai-proxy/, ''),
        },
      },
    },
    build: {
      cssCodeSplit: true,
      minify: 'esbuild',
      target: 'es2020',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router-dom/')) {
                return 'vendor-react';
              }
              if (id.includes('@supabase/')) {
                return 'vendor-supabase';
              }
              if (id.includes('motion/') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          }
        }
      }
    }
  };
});
