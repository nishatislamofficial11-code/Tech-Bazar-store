import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../contexts/SettingsContext';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  schema?: any;
  exactTitle?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  schema,
  exactTitle = false,
  ogTitle,
  ogDescription,
  noindex = false
}) => {
  const { settings } = useSettings();
  
  const hostBrand = typeof window !== 'undefined' && window.location?.hostname
    ? (() => {
        const clean = window.location.hostname.replace(/^www\./i, '').split(':')[0];
        const name = clean.split('.')[0];
        if (!name || name === 'localhost') return 'Online Store';
        return name.charAt(0).toUpperCase() + name.slice(1);
      })()
    : 'Online Store';

  const siteTitle = settings?.siteName?.trim() || hostBrand;
  const siteDesc = settings?.siteDescription?.trim() || `Shop online at ${siteTitle} for the best deals, quality products, and fast home delivery across Bangladesh.`;
  const siteKeywords = settings?.siteKeywords?.trim() || `online shopping, deals, buy online, bangladesh, ${siteTitle.toLowerCase()}`;
  const logo = settings?.site_logo?.trim() || '';
  
  const fullTitle = title 
    ? (exactTitle ? title : `${title} | ${siteTitle}`) 
    : siteTitle;
  const metaDesc = description || (title ? `Check out ${title} at ${siteTitle} for the best deals and premium quality.` : siteDesc);
  const metaKeywords = keywords || siteKeywords;
  const metaImage = image || settings?.ogImage || (logo ? (logo.startsWith('http') ? logo : `${window.location.origin}${logo}`) : '');
  const metaUrl = url || window.location.href;
  const resolvedOgTitle = ogTitle || fullTitle;
  const resolvedOgDescription = ogDescription || metaDesc;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {metaKeywords && <meta name="keywords" content={metaKeywords} />}

      {/* Crawling Directives */}
      <meta 
        name="robots" 
        content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"} 
      />

      {/* Search Engine Verifications */}
      {settings?.google_site_verification && (
        <meta name="google-site-verification" content={settings.google_site_verification.trim()} />
      )}
      {settings?.bing_site_verification && (
        <meta name="msvalidate.01" content={settings.bing_site_verification.trim()} />
      )}
      {settings?.fb_domain_verification && (
        <meta name="facebook-domain-verification" content={settings.fb_domain_verification.trim()} />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={resolvedOgTitle} />
      <meta property="og:description" content={resolvedOgDescription} />
      {metaImage && <meta property="og:image" content={metaImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {settings?.twitterHandle && <meta name="twitter:site" content={settings.twitterHandle} />}
      <meta name="twitter:url" content={metaUrl} />
      <meta name="twitter:title" content={resolvedOgTitle} />
      <meta name="twitter:description" content={resolvedOgDescription} />
      {metaImage && <meta name="twitter:image" content={metaImage} />}
      
      {/* Canonical Link */}
      <link rel="canonical" href={metaUrl} />

      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": siteTitle,
            "url": window.location.origin,
            "logo": metaImage || undefined
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": siteTitle,
            "url": window.location.origin,
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${window.location.origin}/shop?search={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          },
          ...(schema ? (Array.isArray(schema) ? schema : [schema]) : [])
        ])}
      </script>
    </Helmet>
  );
};
