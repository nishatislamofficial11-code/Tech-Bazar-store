export async function onRequest(context) {
  // Access environment variables from Cloudflare context
  const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY;

  const url = new URL(context.request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const headers = SUPABASE_ANON_KEY ? {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  } : {};

  const escapeXml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const generateSlug = (text) => {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  try {
    let products = [];
    let pages = [];
    let categories = [];

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      // 1. Fetch products with title and images
      const productsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=id,title,slug,image,images,created_at&order=created_at.desc`,
        { headers }
      );
      products = productsRes.ok ? await productsRes.json() : [];

      // 2. Fetch pages
      const pagesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/pages?select=slug,created_at&order=created_at.desc`,
        { headers }
      );
      pages = pagesRes.ok ? await pagesRes.json() : [];

      // 3. Fetch categories
      const categoriesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/categories?select=name,created_at&order=created_at.desc`,
        { headers }
      );
      categories = categoriesRes.ok ? await categoriesRes.json() : [];
    }

    // Static priority routes
    const staticRoutes = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/shop', priority: '0.9', changefreq: 'daily' },
      { path: '/track-order', priority: '0.6', changefreq: 'weekly' },
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Static routes
    staticRoutes.forEach(route => {
      sitemap += `
  <url>
    <loc>${escapeXml(`${baseUrl}${route.path}`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
    });

    // Categories
    categories.forEach(category => {
      if (category.name) {
        const catSlug = generateSlug(category.name);
        sitemap += `
  <url>
    <loc>${escapeXml(`${baseUrl}/category/${catSlug}`)}</loc>
    <lastmod>${new Date(category.created_at || Date.now()).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`;
      }
    });

    // Products with Google Image extension
    products.forEach(product => {
      const prodUrl = `${baseUrl}/product/${product.slug || product.id}`;
      const prodTitle = escapeXml(product.title || 'Product');
      const allImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);

      let imageTags = '';
      allImages.slice(0, 5).forEach(img => {
        let fullImg = img;
        if (fullImg.startsWith('/')) fullImg = `${baseUrl}${fullImg}`;
        imageTags += `
    <image:image>
      <image:loc>${escapeXml(fullImg)}</image:loc>
      <image:title>${prodTitle}</image:title>
      <image:caption>${prodTitle}</image:caption>
    </image:image>`;
      });

      sitemap += `
  <url>
    <loc>${escapeXml(prodUrl)}</loc>
    <lastmod>${new Date(product.created_at || Date.now()).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>${imageTags}
  </url>`;
    });

    // Pages
    pages.forEach(page => {
      if (page.slug) {
        sitemap += `
  <url>
    <loc>${escapeXml(`${baseUrl}/pages/${page.slug}`)}</loc>
    <lastmod>${new Date(page.created_at || Date.now()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });

    sitemap += `\n</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800', // Fresh cache every 30 mins
        'X-Robots-Tag': 'noindex', // Prevent indexing the raw sitemap XML file itself
      },
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
