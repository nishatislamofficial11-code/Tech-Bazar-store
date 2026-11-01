export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.host;
  const protocol = url.protocol;
  const baseUrl = `${protocol}//${host}`;

  const robotsTxt = `# Dynamic robots.txt for ${host}
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /checkout
Disallow: /checkout/

User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
