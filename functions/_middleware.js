import { onRequest as catalogFeedHandler } from './api/catalog-feed.js';
import { onRequest as courierProxyHandler } from './api/courier-proxy.js';
import { onRequest as courierWebhookHandler } from './api/courier-webhook.js';
import { onRequest as blacklistTrapHandler } from './api/blacklist-trap.js';
import { onRequest as sitemapHandler } from './sitemap.xml.js';
import { onRequest as robotsHandler } from './robots.txt.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const normalizedPath = url.pathname.replace(/\/+/g, '/');

  // Direct edge function handlers to prevent any 404 or double-slash routing issues on Cloudflare Pages
  if (normalizedPath === '/api/blacklist-trap') {
    return blacklistTrapHandler(context);
  }
  if (normalizedPath === '/api/catalog-feed' || normalizedPath === '/api/catalog-feed.php') {
    return catalogFeedHandler(context);
  }
  if (normalizedPath === '/api/courier-proxy' || normalizedPath === '/api/courier-proxy.php') {
    return courierProxyHandler(context);
  }
  if (normalizedPath === '/api/courier-webhook' || normalizedPath === '/api/courier-webhook.php') {
    return courierWebhookHandler(context);
  }
  if (normalizedPath === '/sitemap.xml') {
    return sitemapHandler(context);
  }
  if (normalizedPath === '/robots.txt') {
    return robotsHandler(context);
  }

  // Pass through to the next function or static asset
  const response = await context.next();

  // Only intercept HTML responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('text/html')) {
    return response;
  }

  // Supabase credentials from Cloudflare Pages Environment
  const SUPABASE_URL = context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY;

  const path = normalizedPath;
  const baseUrl = `${url.protocol}//${url.host}`;

  // Dynamically derive brand name from the active hostname (e.g. toomol.com -> Toomol)
  const hostName = url.hostname.replace(/^www\./i, '');
  const brandFromHost = hostName ? hostName.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Store';

  let siteName = brandFromHost || 'Store';
  let title = `${siteName} - Online Shopping in Bangladesh`;
  let description = `Shop online at ${siteName} for authentic products at best prices in Bangladesh with fast home delivery and cash on delivery.`;
  let keywords = `${siteName.toLowerCase()}, online shopping bangladesh, best price bd, cash on delivery, fast delivery`;
  let image = '';
  let ogTitle = '';
  let ogDescription = '';
  let canonicalUrl = `${baseUrl}${path}`;
  let jsonLdSchemas = [];
  let prerenderedHtml = '';

  const headers = SUPABASE_ANON_KEY ? {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  } : {
    'Content-Type': 'application/json',
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  let googleSiteVerification = '';
  let bingSiteVerification = '';
  let fbDomainVerification = '';

  try {
    // 1. Fetch global SEO settings (only if Supabase credentials exist)
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, { headers });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const settings = {};
        settingsData.forEach(item => {
          settings[item.key] = item.value;
        });

        siteName = settings.siteName || siteName;
        title = settings.ogTitle || settings.siteName || title;
        description = settings.siteDescription || settings.ogDescription || description;
        keywords = settings.siteKeywords || keywords;
        ogTitle = settings.ogTitle || title;
        ogDescription = settings.ogDescription || description;
        image = settings.ogImage || settings.site_logo || '';
        googleSiteVerification = settings.google_site_verification || '';
        bingSiteVerification = settings.bing_site_verification || '';
        fbDomainVerification = settings.fb_domain_verification || '';
      }
    }

    // Default Organization & WebSite Schema
    jsonLdSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: baseUrl,
      logo: image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : undefined,
    });

    jsonLdSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/shop?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });

    // 2. PRODUCT PAGE ROUTE: /product/:idOrSlug
    if (path.startsWith('/product/')) {
      const slugOrId = path.split('/')[2];
      if (slugOrId) {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(slugOrId);
        
        let queryUrl = `${SUPABASE_URL}/rest/v1/products?select=id,title,meta_title,description,meta_description,image,images,price,original_price,stock,rating,reviews,slug,category_id,created_at&limit=1`;
        if (isUuid) {
          queryUrl += `&id=eq.${slugOrId}`;
        } else {
          queryUrl += `&slug=eq.${slugOrId}`;
        }

        const productRes = await fetch(queryUrl, { headers });
        if (productRes.ok) {
          const productData = await productRes.json();
          if (productData && productData.length > 0) {
            const product = productData[0];
            const prodName = product.title || 'Product';
            
            // Dynamic Title & Meta
            title = product.meta_title ? product.meta_title : `${prodName} Price in Bangladesh | ${siteName}`;
            
            const cleanDesc = stripHtml(product.description || '');
            description = product.meta_description || cleanDesc.slice(0, 160) || `Buy ${prodName} at best price in Bangladesh from ${siteName}. Fast delivery & authentic quality guaranteed.`;
            
            ogTitle = title;
            ogDescription = description;
            
            // Images
            let prodImage = product.image || image;
            if (prodImage && prodImage.startsWith('/')) {
              prodImage = `${baseUrl}${prodImage}`;
            }
            image = prodImage;

            const allImages = [image, ...(Array.isArray(product.images) ? product.images : [])]
              .filter(Boolean)
              .map(img => img.startsWith('/') ? `${baseUrl}${img}` : img);

            canonicalUrl = `${baseUrl}/product/${product.slug || product.id}`;
            const displayPrice = product.price || 0;
            const inStock = (product.stock ?? 100) > 0;
            const avgRating = product.rating || 5.0;
            const reviewCount = product.reviews || 1;

            // Fetch category name if available for Breadcrumbs
            let categoryName = 'Products';
            let categorySlug = '';
            if (product.category_id) {
              try {
                const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=name,id&id=eq.${product.category_id}&limit=1`, { headers });
                if (catRes.ok) {
                  const catData = await catRes.json();
                  if (catData && catData.length > 0) {
                    categoryName = catData[0].name || categoryName;
                    categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  }
                }
              } catch (e) {}
            }

            // Schema: Product (Rich Snippet)
            jsonLdSchemas.push({
              '@context': 'https://schema.org/',
              '@type': 'Product',
              name: prodName,
              image: allImages,
              description: description,
              sku: String(product.id),
              brand: {
                '@type': 'Brand',
                name: product.store || siteName,
              },
              offers: {
                '@type': 'Offer',
                url: canonicalUrl,
                priceCurrency: 'BDT',
                price: displayPrice,
                priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                itemCondition: 'https://schema.org/NewCondition',
                availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                seller: {
                  '@type': 'Organization',
                  name: siteName,
                },
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: String(avgRating),
                reviewCount: String(reviewCount),
                bestRating: '5',
                worstRating: '1',
              },
            });

            // Schema: BreadcrumbList
            jsonLdSchemas.push({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: baseUrl,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: categoryName,
                  item: categorySlug ? `${baseUrl}/category/${categorySlug}` : `${baseUrl}/shop`,
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: prodName,
                  item: canonicalUrl,
                },
              ],
            });

            // Pre-rendered HTML inside #root for Instant First-Pass Googlebot Indexing
            prerenderedHtml = `
              <div id="seo-prerender-wrapper" style="max-width:1200px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
                <nav aria-label="Breadcrumb" style="font-size:14px;color:#6b7280;margin-bottom:16px;">
                  <a href="${baseUrl}" style="color:#2563eb;text-decoration:none;">Home</a> &rsaquo; 
                  <a href="${categorySlug ? `${baseUrl}/category/${categorySlug}` : `${baseUrl}/shop`}" style="color:#2563eb;text-decoration:none;">${escapeHtml(categoryName)}</a> &rsaquo; 
                  <span style="color:#111827;">${escapeHtml(prodName)}</span>
                </nav>
                <main>
                  <h1 style="font-size:28px;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">${escapeHtml(prodName)}</h1>
                  <div style="font-size:24px;font-weight:800;color:#059669;margin-bottom:12px;">৳${displayPrice} BDT</div>
                  <div style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;margin-bottom:16px;background:${inStock ? '#dcfce7;color:#15803d' : '#fee2e2;color:#b91c1c'};">
                    ${inStock ? 'In Stock - Available for Order' : 'Out of Stock'}
                  </div>
                  <div style="margin-bottom:20px;">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(prodName)}" style="max-width:400px;width:100%;height:auto;border-radius:12px;border:1px solid #e2e8f0;" loading="eager" />
                  </div>
                  <div style="font-size:15px;line-height:1.7;color:#334155;">
                    <h2 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px;">Product Overview</h2>
                    <p>${escapeHtml(description)}</p>
                  </div>
                </main>
              </div>
            `;
          }
        }
      }
    } 
    // 3. CATEGORY / SHOP ROUTE: /shop
    else if (path === '/shop') {
      const categoryParam = url.searchParams.get('category');
      if (categoryParam) {
        const formattedCat = categoryParam.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        title = `${formattedCat} Online in Bangladesh | ${siteName}`;
        description = `Browse the latest collection of ${formattedCat} at unbeatable prices in Bangladesh on ${siteName}. Cash on delivery & fast shipping.`;
        canonicalUrl = `${baseUrl}/category/${encodeURIComponent(categoryParam)}`;
      } else {
        title = `Shop All Products | ${siteName}`;
        description = `Explore trending products and exclusive deals at ${siteName}. Best prices, cash on delivery, and genuine quality.`;
        canonicalUrl = `${baseUrl}/shop`;
      }
      ogTitle = title;
      ogDescription = description;
    } 
    // 3.5. CATEGORY ROUTE: /category/:slug and backwards-compatible /shop/category/:slug
    else if (path.startsWith('/category/') || path.startsWith('/shop/category/')) {
      const parts = path.split('/');
      const categorySlug = path.startsWith('/category/') ? parts[2] : parts[3];
      if (categorySlug) {
        const formattedCat = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        title = `${formattedCat} Online in Bangladesh | ${siteName}`;
        description = `Browse the latest collection of ${formattedCat} at unbeatable prices in Bangladesh on ${siteName}. Cash on delivery & fast shipping.`;
        canonicalUrl = `${baseUrl}/category/${encodeURIComponent(categorySlug)}`;
        ogTitle = title;
        ogDescription = description;
      }
    } 
    // 4. CMS PAGES ROUTE: /pages/:slug
    else if (path.startsWith('/pages/')) {
      const pageSlug = path.split('/')[2];
      if (pageSlug) {
        const pageRes = await fetch(`${SUPABASE_URL}/rest/v1/pages?select=title,content&slug=eq.${pageSlug}&limit=1`, { headers });
        if (pageRes.ok) {
          const pageData = await pageRes.json();
          if (pageData && pageData.length > 0) {
            const pageItem = pageData[0];
            title = `${pageItem.title} | ${siteName}`;
            const cleanContent = stripHtml(pageItem.content || '');
            description = cleanContent.slice(0, 160) || description;
            ogTitle = title;
            ogDescription = description;
            canonicalUrl = `${baseUrl}/pages/${pageSlug}`;
          }
        }
      }
    }
  } catch (err) {
    console.error('Edge SEO execution error:', err);
  }

  // Ensure absolute image URL
  if (image && image.startsWith('/')) {
    image = `${baseUrl}${image}`;
  }

  // Prepare Meta Tags & JSON-LD
  const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="keywords" content="${escapeHtml(keywords)}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    ${googleSiteVerification ? `<meta name="google-site-verification" content="${escapeHtml(googleSiteVerification)}">` : ''}
    ${bingSiteVerification ? `<meta name="msvalidate.01" content="${escapeHtml(bingSiteVerification)}">` : ''}
    ${fbDomainVerification ? `<meta name="facebook-domain-verification" content="${escapeHtml(fbDomainVerification)}">` : ''}
    <meta property="og:type" content="${path.startsWith('/product/') ? 'product' : 'website'}">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(ogDescription)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:site_name" content="${escapeHtml(siteName)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <script type="application/ld+json">
      ${JSON.stringify(jsonLdSchemas)}
    </script>
`;

  class HeadInjector {
    element(element) {
      element.append(metaTags, { html: true });
    }
  }

  class RootContentInjector {
    element(element) {
      if (prerenderedHtml) {
        element.setInnerContent(prerenderedHtml, { html: true });
      }
    }
  }

  return new HTMLRewriter()
    .on('head', new HeadInjector())
    .on('div#root', new RootContentInjector())
    .transform(response);
}
