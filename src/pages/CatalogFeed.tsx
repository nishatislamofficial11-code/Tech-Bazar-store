import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';

export default function CatalogFeed() {
  const { settings } = useSettings();
  const [xmlContent, setXmlContent] = useState<string>('Loading feed...');

  useEffect(() => {
    const generateFeed = async () => {
      try {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        const siteUrl = window.location.origin;
        const siteTitle = settings?.siteName || 'Store';

        const itemsXml = (products || []).map((p) => {
          const id = p.id;
          const title = (p.title || p.name || 'Product').replace(/[<>&'"]/g, (c: string) => {
            switch (c) {
              case '<': return '&lt;';
              case '>': return '&gt;';
              case '&': return '&amp;';
              case '\'': return '&apos;';
              case '"': return '&quot;';
              default: return c;
            }
          });
          const cleanDesc = (p.description || p.title || '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/[<>&'"]/g, (c: string) => {
              switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
              }
            })
            .trim()
            .slice(0, 5000);
          const availability = (p.stock ?? 100) > 0 ? 'in stock' : 'out of stock';
          const price = `${Number(p.price || 0).toFixed(2)} BDT`;
          const link = `${siteUrl}/product/${p.slug || p.id}`;
          const imageLink = p.image || '';
          const brand = (p.store || siteTitle).replace(/[<>&'"]/g, '&amp;');

          return `    <item>
      <g:id>${id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${cleanDesc}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
    </item>`;
        }).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${siteTitle}</title>
    <link>${siteUrl}</link>
    <description>Facebook &amp; TikTok Live Product Catalog Feed for ${siteTitle}</description>
${itemsXml}
  </channel>
</rss>`;

        setXmlContent(xml);
      } catch (err) {
        setXmlContent('Error generating feed');
      }
    };

    generateFeed();
  }, [settings]);

  return (
    <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap break-all min-h-screen">
      {xmlContent}
    </pre>
  );
}
