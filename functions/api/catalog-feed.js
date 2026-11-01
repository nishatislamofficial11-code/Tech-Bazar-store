/**
 * Cloudflare Pages Function for Live Facebook & TikTok Product Catalog Feed
 * Endpoints: /api/catalog-feed and /api/catalog-feed.php
 */
export async function onRequest(context) {
  const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response('Supabase credentials not configured in environment variables.', { status: 500 });
  }

  const urlObj = new URL(context.request.url);
  const siteUrl = urlObj.origin;
  const format = urlObj.searchParams.get('format') || 'xml';

  const getBrandFromHost = (hostname) => {
    if (!hostname) return 'Store';
    const clean = hostname.replace(/^www\./i, '').split(':')[0];
    const namePart = clean.split('.')[0];
    if (!namePart || namePart === 'localhost') return 'Store';
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };
  const hostBrand = getBrandFromHost(urlObj.hostname);

  try {
    let products = [];
    let siteTitle = hostBrand;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      // 1. Fetch products
      try {
        const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (prodRes.ok) {
          products = await prodRes.json() || [];
        }
      } catch (e) {
        console.error('Failed to fetch products for catalog feed:', e);
      }

      // 2. Fetch site title
      try {
        const settRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.siteName`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        if (settRes.ok) {
          const settData = await settRes.json();
          if (settData && settData[0]?.value) siteTitle = settData[0].value;
        }
      } catch(e) {}
    }

    // CSV format output
    if (format === 'csv') {
      const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
      const rows = products.map((p) => {
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

      const csvContent = [headers.join(','), ...rows].join('\n');
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, must-revalidate'
        }
      });
    }

    const cdata = (val) => {
      const cleaned = String(val || '')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/]]>/g, ']]]]><![CDATA[>');
      return `<![CDATA[${cleaned}]]>`;
    };

    // Default XML format output (RSS 2.0 / Google & Facebook standard)
    const itemsXml = products.map((p) => {
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

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, must-revalidate'
      }
    });

  } catch (err) {
    return new Response(`Error generating catalog feed: ${err.message}`, { status: 500 });
  }
}
