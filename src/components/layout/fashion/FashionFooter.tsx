import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useSettings } from '../../../contexts/SettingsContext';
import { buildCloudinaryUrl } from '../../../lib/cloudinary';
import { useFeaturedCategories, categoryPath } from '../../home/useHomeData';

const SUPPORT_PAGE = /(return|refund|shipping|delivery|faq|contact|help)/i;

/** Fashion theme footer: logo, contact, Shop / Support / Company links. Shows only what the shop has set up. */
export function FashionFooter() {
  const { settings } = useSettings();
  const { rows: categories } = useFeaturedCategories();
  const [pages, setPages] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    supabase.from('pages').select('slug, title').order('created_at').then(({ data }) => setPages(data || []));
  }, []);

  const support = pages.filter((p) => SUPPORT_PAGE.test(p.slug) || SUPPORT_PAGE.test(p.title));
  const company = pages.filter((p) => !support.includes(p));
  const year = new Date().getFullYear();
  const link = 'text-[15px] text-slate-500 hover:text-primary transition-colors';

  return (
    <footer className="mt-10 bg-slate-50 border-t border-slate-200 pt-12 pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto px-5 grid gap-10 md:grid-cols-4">
        <div>
          {settings?.site_logo ? (
            <img src={buildCloudinaryUrl(settings.site_logo, 'w_432,h_112,c_limit,f_auto,q_auto')} alt={settings?.siteName || settings?.site_title || 'Logo'} className="h-10 w-auto object-contain" loading="lazy" />
          ) : (settings?.siteName || settings?.site_title) ? (
            <p className="text-[28px] font-extrabold tracking-tight text-primary">{settings.siteName || settings.site_title}</p>
          ) : null}
          <div className="mt-4 space-y-1.5">
            {settings?.store_phone && <a href={`tel:${settings.store_phone}`} className="flex items-center gap-2 text-slate-500"><Phone size={17} /> {settings.store_phone}</a>}
            {settings?.store_email && <a href={`mailto:${settings.store_email}`} className="flex items-center gap-2 text-slate-500"><Mail size={17} /> {settings.store_email}</a>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:col-span-3 md:grid-cols-3">
          {categories.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-4">Shop</h3>
              <ul className="space-y-3">{categories.slice(0, 5).map((c) => <li key={c.id}><Link to={categoryPath(c.name)} className={link}>{c.name}</Link></li>)}</ul>
            </div>
          )}
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <li><Link to="/track-order" className={link}>Track Order</Link></li>
              {support.map((p) => <li key={p.slug}><Link to={`/pages/${p.slug}`} className={link}>{p.title}</Link></li>)}
            </ul>
          </div>
          {company.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-4">Company</h3>
              <ul className="space-y-3">{company.map((p) => <li key={p.slug}><Link to={`/pages/${p.slug}`} className={link}>{p.title}</Link></li>)}</ul>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-5 mt-10 pt-6 border-t border-slate-200 text-center text-sm text-slate-500 space-y-1">
        <p>{settings?.copyright_text || `© ${year} ${settings?.siteName || settings?.site_title || ''}. All rights reserved.`}</p>
        <p>Payments: Cash on Delivery</p>
      </div>
    </footer>
  );
}
